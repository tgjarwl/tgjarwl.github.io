---
layout: post
title: winword中dde执行
date: 2021-11-26
tags: 逆向开发
---

## Life
做一个有灵魂的人，而不是只是会服从命令的行尸走肉

## 声明
并非完整的dde流程介绍，只是介绍dde用来执行恶意代码的过程，dde叙述过程可能不全

## 前置条件
完整的ddeauto命令是这样的
```
{DDEAUTO c:\\windows\\system32\\cmd.exe "/k calc.exe"}
```

当用户第一次打开带有ddeauto的文档时，winword会检测，并提示用户执行dde命令
![avatar](/images/pages/2021-11-26-winword-dde/dde-ref-tips.png)

当用户同意后，正式开始dde的执行流程

## dde
dde也是数据交互的一种方式，这种交互的方式是通过windows的一些dde消息来进行的，例如：
![avatar](/images/pages/2021-11-26-winword-dde/dde-doc.png)

引用地址： https://docs.microsoft.com/en-us/windows/win32/dataxchg/wm-dde-initiate

## winword是如何执行ddeauto命令的
当用户确认使用链接中的数据更新此文档后，winword开始处理dde，大致非为三个部分
```
DDE初始化
DDE执行
启动目标程序
```

## 广播dde初始化消息(WM_DDE_INITIATE)
广播 WM_DDE_INITIATE 消息，通知所有的窗口，winword启动了一个dde的client。
![avatar](/images/pages/2021-11-26-winword-dde/dde-init.png)

近距离看下 WM_DDE_INITIATE 消息的说明
![avatar](/images/pages/2021-11-26-winword-dde/dde-init-doc.png)

也就是说LPARAM是目标程序和命令行的组合。只不过这个组合是命令行和目标程序对应的 ATOM（简单来说就是把一个字符串，转换成对应的一个整数id，方便一些操作）

PARAM_ATOM | EXE_ATOM
![avatar](/images/pages/2021-11-26-winword-dde/dde-msg-param.png)

所以针对这种情况，我们是可以在发送消息这一刻进行一个拦截。这种情况下，是用户已经第一次同意执行ddeauto的命令

## DDEAUTO执行
如果放过第一步，则接下来的操作，会封装dde数据，并且跟目标程序进行交互。封装交互的逻辑过于复杂，需要深入协议内部，故在不做进一步讨论
![avatar](/images/pages/2021-11-26-winword-dde/dde-pack.png)

这个时候，因为目标程序没有运行，所以会再次弹出一个确认窗，是否启动目标程序。
![avatar](/images/pages/2021-11-26-winword-dde/if-start-dst.png)

## 用户同意启动目标程序
这就是最后一步操作了，在这一步操作中，winword会尝试启动目标程序
![avatar](/images/pages/2021-11-26-winword-dde/user-choice-start.png)

这个函数也是一个最佳的拦截点。这里可以拿到exe和参数。这两个数据都是ATOM，只需要自己获取ATOM对应的数据即可。

待目标程序启动后，word会尝试重复初始化并执行的过程。