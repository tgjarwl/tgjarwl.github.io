---
layout: post
title: windbg中使用js脚本设置条件断点 - 效率篇
date: 2023-04-24
tags: windbg
---

## Life
只有不断探索，才会有不断的进度，每一天都是美好的一天

## 上个方案回顾
老实说，上一篇文章里面的方案，我自己并不是很满意，原因就是每次都得加载下脚本，解析，然后才能工作，这样子会浪费很多的时间，所以，在实际使用时，还是得使用下函数的方案。于是乎就有了这篇令我满意的文章。

## 前提
在使用javascript 前，还是需要初始化环境
```
kd>.load jsprovider.dll

kd> .scriptproviders
Available Script Providers:
    NatVis (extension '.NatVis')
    JavaScript (extension '.js')
```

之后，先把脚本加载到内存
```
kd> .scriptload e:\bug\auto.js
JavaScript script successfully loaded from 'e:\bug\auto.js'
```

## 设置断点

脚本里面的内容如下
```JavaScript
// WinDbg JavaScript sample
function IsNeedBreak()
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
虽然脚本加载后，无法解析出来里面的函数，但是直接使用还是没问题的。
```
kd> dx Debugger.State.Scripts.auto.Contents
Debugger.State.Scripts.auto.Contents                 : [object Object]
    host             : [object Object]

```

下面就可以直接设置断点了
```
kd> bp nt!NtTerminateProcess "dx Debugger.State.Scripts.auto.Contents.IsNeedBreak(); .if (@$t0 == 1) {} .else {gc}"
breakpoint 0 redefined
kd> bl
     0 e Disable Clear  840b8a51     0001 (0001) nt!NtTerminateProcess "dx Debugger.State.Scripts.auto.Contents.IsNeedBreak(); .if (@$t0 == 1) {} .else {gc}"

```

经过优化后的脚本，速度比以前有了很大的改善，这才是心目中想想的样子
```
called
 # ChildEBP RetAddr      Args to Child              
00 9c6f7140 866561a9     8000151c 00000000 00000000 nt!NtTerminateProcess
WARNING: Frame IP not in any known module. Following frames may be wrong.
01 9c6f71e8 83e8fa6a     8000151c 00000000 9c6f72bc 0x866561a9
    <Intermediate frames may have been skipped due to lack of complete unwind>
02 9c6f71e8 83e8e8d9 (T) 8000151c 00000000 9c6f72bc nt!KiSystemServicePostCall (FPO: [0,3] TrapFrame @ 9c6f71f8)
    <Intermediate frames may have been skipped due to lack of complete unwind>
03 9c6f7268 9289c4bd (T) 8000151c 00000000 00000000 nt!ZwTerminateProcess+0x11 (FPO: [2,0,0])
04 9c6f72bc 92887133     00001de4 00001e08 00000001 AtdrAgent+0x194bd
hit 
go on 
Debugger.State.Scripts.auto.Contents.IsNeedBreak()
nt!NtTerminateProcess:
840b8a51 8bff            mov     edi,edi
```

