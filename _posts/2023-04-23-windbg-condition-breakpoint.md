---
layout: post
title: windbg中使用js脚本设置条件断点
date: 2023-04-23
tags: windbg
---

## Life
马上五一了，从过年到现在一次都没有回家呢，再不回去，整个人都不好了。2023，又是特殊的一年。

## 条件断点
windbg中支持 javascript 脚本，这是一个很强大的功能。 强两天在测试功能的时候，需要安装sql server，但是安装过程竟然被拦截了，通过procmon 发现，在进程创建的时候，直接通过apc 退出了，那么第一反应，必然是某个驱动在进程创建的时候给杀掉了进程。折腾了好长时间，最终无奈还是上了双击调试。但是NtTerminateProcess 在整个的安装过程中调用太频繁，没法一次一次的手工恢复执行，只能使用条件断点。查看完机器上的我司的驱动后，发现就那么几个，在断点处，回溯下堆栈，只要有我司的驱动模块，就中断下来。于是想到了强大的 JavaScript 脚本。

## 第一次的失败尝试
加载jsprovider.dll， 之后执行.scriptproviders 确保成功加载了。
```
kd>.load jsprovider.dll

kd> .scriptproviders
Available Script Providers:
    NatVis (extension '.NatVis')
    JavaScript (extension '.js')
```

于是三下五除二，便搞定了脚本的核心功能
```javascript

// E:\bug\ContitionBreak.js

 // Use JavaScript stric mode 
"use strict";
 
// Define the invokeScript method to handle breakpoints
 
function invokeScript()
{
	var ctl = host.namespace.Debugger.Utility.Control;
	
	host.diagnostics.debugLog("called\n");
	var bStop = 0;
	var stackInfo = ctl.ExecuteCommand("kv");
	for (var line of stackInfo)
	{
		host.diagnostics.debugLog(line+"\n");
		if(line.indexOf("AtdrAgent") != -1 ){
			host.diagnostics.debugLog("hit \n");
            bStop = 1;
			break;
		}
	}

    if (bStop == 0)
    {
        ctl.ExecuteCommand("gc");
        host.diagnostics.debugLog("go on \n");
    }
}

```

于是在windbg 中设置了 条件断点，愉快的等待结束
```
kd> bp nt!NtTerminateProcess ".scriptrun E:\\bug\\ContitionBreak.js"
```

结果没有断下来，于是各种google 发现 ctl.ExecuteCommand("gc"); 这句话，并不会真正生效。心中万马奔腾而过。
```
kd> dx -r1 Debugger.Utility.Control
Debugger.Utility.Control                
    ExecuteCommand   [ExecuteCommand(command) - Method which executes a debugger command and returns a collection of strings representing the lines of output of the command execution]
    SetBreakpointAtSourceLocation [SetBreakpointAtSourceLocation(source_file, source_line, (opt) module_name) - Method which sets a breakpoint at a source line location and returns it as an object in order to be able to control its options]
    SetBreakpointAtOffset [SetBreakpointAtOffset(function_name, function_offset, (opt) module_name) - Method which sets a breakpoint at an offset and returns it as an object in order to be able to control its options]
    SetBreakpointForReadWrite [SetBreakpointForReadWrite(address, (opt) type, (opt) size) - Method which sets a breakpoint on read/write (default) at a certain address and returns it as an object in order to be able to control its options]
    ChangeRegisterContext [ChangeRegisterContext(inheritUnspecifiedValues, pc, sp, [fp], [regCtx]) | ChangeRegisterContext(inheritUnspecifiedValues, regCtx) - Changes the active register context with a given abstract pc, sp, and optional fp or an optional object which contains named registers and values.  This is largely equivalent to having done .cxr in the debugger.  It does *NOT* change the register values of the thread/processor, only the debugger's current view of them]
    WalkStackForRegisterContext [WalkStackForRegisterContext(inheritUnspecifiedValues, pc, sp, [fp], [regCtx]) | WalkStackForRegisterContext(inheritUnspecifiedValues, regCtx) - Performs a stack walk given the incoming abstract pc, sp, and optional fp or an optional object which contains named registers and values.  The returned stack walk is of the same form as <ThreadObject>.Stack]

```

## 奇技淫巧
之后各种尝试,均以失败告终，瞬间对自己面对windbg 这座大山，压力山大。于是开始艰难的阅读手册，寻找一线希望，经过两天的艰苦探索，突然在一篇文章中，发现了 伪寄存器的用法 $t0 - $t19，瞬间灵感出现，于是一种写法，孕育而生，在 bp 的命令里面判断 脚本中的返回值（想过直接只用脚本中的自定义函数，但是windbg一直识别不了我的函数，只能识别固定的入口函数。。。），于是用下面这种写法
```
kd> bp nt!NtTerminateProcess ".scriptrun E:\\bug\\ContitionBreak.js; .if ($t0 == 1) {} .else {gc}"

```

脚本里面的内容改成下面的样子
```javascript

// Use JavaScript stric mode 
"use strict";
 
// Define the invokeScript method to handle breakpoints
 
function invokeScript()
{
	var ctl = host.namespace.Debugger.Utility.Control;
	
	host.diagnostics.debugLog("called\n");
	
	ctl.ExecuteCommand("r $t0=0x0");
	
	var stackInfo = ctl.ExecuteCommand("kv");
	for (var line of stackInfo)
	{
        host.diagnostics.debugLog(line+"\n");
		if(line.indexOf("AtdrAgent") != -1 ){
			host.diagnostics.debugLog("hit \n");
			ctl.ExecuteCommand("r $t0=0x1");
			break;
		}
	}

	host.diagnostics.debugLog("go on \n");
}

```

通过这种完美的配合，成功的实现了，精准的判断。双击安装程序，不一会，期待的画面出现在了眼前。
```
JavaScript script successfully loaded from 'E:\bug\ContitionBreak.js'
called
 # ChildEBP RetAddr      Args to Child              
00 ae6cb140 868311a9     80000dec 00000000 00000000 nt!NtTerminateProcess
WARNING: Frame IP not in any known module. Following frames may be wrong.
01 ae6cb1e8 83e95a6a     80000dec 00000000 ae6cb2bc 0x868311a9
    <Intermediate frames may have been skipped due to lack of complete unwind>
02 ae6cb1e8 83e948d9 (T) 80000dec 00000000 ae6cb2bc nt!KiSystemServicePostCall (FPO: [0,3] TrapFrame @ ae6cb1f8)
    <Intermediate frames may have been skipped due to lack of complete unwind>
03 ae6cb268 8cb474bd (T) 80000dec 00000000 00000000 nt!ZwTerminateProcess+0x11 (FPO: [2,0,0])
04 ae6cb2bc 8cb32133     00000d64 00000394 00000001 AtdrAgent+0x194bd
hit 
go on 
nt!NtTerminateProcess:
840bea51 8bff            mov     edi,edi
```


## 总结
很多事情都会过去，要么鉴定的走过去，要么绕道过去，生活不过是一个路途而已，不必太过于纠结