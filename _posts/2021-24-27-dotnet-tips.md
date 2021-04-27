---
layout: post
title: dotnet查找xxx.ni.dll中jit代码
date: 2021-04-27
tags: dotnet  
---


# 文件区别

以 system.dll 和 system.ni.dll 举例，这两个文件的不同在于，system.dll 中的 il 代码在被调用前需要 经过 jit（mscorjit.dll 或者 clrjit.dll）模块中 CompileMethod 方法编译成 汇编代码。而system.ni.dll 则是已经被提前 jit 的代码。运行时不需要再调用 CompileMethod 去编译。

出于一些监控的目的，可能需要去hook jit后的汇编代码。那就需要定位jit后的代码的位置。下面用一些小技巧在 windbg 中快速定位，


# 加载 sos 扩展模块

.loadby sos clr


# 关键点

.net 扩展指令 !bpmd -MD [MethodDesc] 指令如果发现某方法已经被jit过了，则会直接对jit后的地址下断点。因为加载的是 ni.dll。 本身已经是被jit过的。所以把jit后的地址给拿到。从而省区了很多麻烦。

# 查找目标类的 MethodTable 

例如：System.Net.WebClient.DownloadFile方法

```
0:023> !Name2EE * System.Net.WebClient

...

Module:      00007ffa6ff91000
Assembly:    System.dll
Token:       0000000002000165
MethodTable: 00007ffa70002788
EEClass:     00007ffa70107b50
Name:        System.Net.WebClient

...

```

# 查找目标方法的 MethodDesc

```
0:023> !DumpMT -MD 00007ffa70002788
EEClass:         00007ffa70107b50
Module:          00007ffa6ff91000
Name:            System.Net.WebClient
mdToken:         0000000002000165
File:            C:\WINDOWS\Microsoft.Net\assembly\GAC_MSIL\System\v4.0_4.0.0.0__b77a5c561934e089\System.dll
BaseSize:        0x150
ComponentSize:   0x0
Slots in VTable: 213
Number of IFaces in IFaceMap: 2
--------------------------------------

...

00007ffa703b23d8 00007ffa70156228 PreJIT System.Net.WebClient.DownloadData(System.String)
00007ffa703b23e0 00007ffa70156238 PreJIT System.Net.WebClient.DownloadData(System.Uri)
00007ffa703b23e8 00007ffa70156250 PreJIT System.Net.WebClient.DownloadDataInternal(System.Uri, System.Net.WebRequest ByRef)
00007ffa703b23f0 00007ffa70156268 PreJIT System.Net.WebClient.DownloadFile(System.String, System.String)
00007ffa703b23f8 00007ffa70156278 PreJIT System.Net.WebClient.DownloadFile(System.Uri, System.String)

...

```

# 下断点，找到 jit 后的地址

```
0:023> !bpmd -MD 00007ffa70156278
MethodDesc = 00007ffa70156278
Setting breakpoint: bp 00007FFA708214B0 [System.Net.WebClient.DownloadFile(System.Uri, System.String)]

```

从提示信息里面可以知道，代码位于 00007FFA708214B0

```
0:023> !U /d 00007FFA708214B0
preJIT generated code
System.Net.WebClient.DownloadFile(System.Uri, System.String)
Begin 00007ffa708214b0, size 2ef
00007ffa`708214b0 55              push    rbp
00007ffa`708214b1 57              push    rdi
00007ffa`708214b2 56              push    rsi
00007ffa`708214b3 53              push    rbx
00007ffa`708214b4 4883ec48        sub     rsp,48h
00007ffa`708214b8 488d6c2460      lea     rbp,[rsp+60h]
00007ffa`708214bd 488965c8        mov     qword ptr [rbp-38h],rsp
00007ffa`708214c1 48894d10        mov     qword ptr [rbp+10h],rcx
00007ffa`708214c5 4c894520        mov     qword ptr [rbp+20h],r8
00007ffa`708214c9 488bf2          mov     rsi,rdx
00007ffa`708214cc 90              nop
00007ffa`708214cd e8be9da9ff      call    System_ni!System.Net.Logging.get_On()$##6000BAC (00007ffa`702bb290)
00007ffa`708214d2 84c0            test    al,al
00007ffa`708214d4 743d            je      System_ni!System.Net.WebClient.DownloadFile(System.Uri, System.String)$##6000D19+0x63 (00007ffa`70821513)
00007ffa`708214d6 90              nop

...

```

通过查看地址，确实可以发现是 system.ni.dll里面的

```
0:023> lmDvm system_ni
Browse full module list
start             end                 module name
00007ffa`6ff90000 00007ffa`70c00000   System_ni C (pdb symbols)          e:\mysymbol\System.ni.pdb\5DD302CC18514670950E7F3FBEBDDB061\System.ni.pdb
    Loaded symbol image file: C:\WINDOWS\assembly\NativeImages_v4.0.30319_64\System\5dd302cc18514670950e7f3fbebddb06\System.ni.dll
    Image path: C:\WINDOWS\assembly\NativeImages_v4.0.30319_64\System\5dd302cc18514670950e7f3fbebddb06\System.ni.dll
    Image name: System.ni.dll
    Browse all global symbols  functions  data
    Has CLR image header, track-debug-data flag not set
    Timestamp:        Thu Oct  8 08:55:49 2020 (5F7E6395)
    CheckSum:         00000000
    ImageSize:        00C70000
    File version:     4.8.4300.0
    Product version:  4.0.30319.0
    File flags:       8 (Mask 3F) Private
    File OS:          4 Unknown Win32
    File type:        2.0 Dll
    File date:        00000000.00000000
    Translations:     0409.04b0
    Information from resource tables:
        CompanyName:      Microsoft Corporation
        ProductName:      Microsoft® .NET Framework
        InternalName:     System.dll
        OriginalFilename: System.dll
        ProductVersion:   4.8.4300.0
        FileVersion:      4.8.4300.0 built by: NET48REL1LAST_C
        PrivateBuild:     DDBLD342B
        FileDescription:  .NET Framework
        LegalCopyright:   © Microsoft Corporation.  All rights reserved.
        Comments:         Flavor=Retail

```