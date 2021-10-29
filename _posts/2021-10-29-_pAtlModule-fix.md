---
layout: post
title: _pAtlModule崩溃
date: 2021-10-29
tags: [BUG]
---

## Life
以前被罩着的时候，啥问题，群里面一吼，基本都知道答案了，无奈老大哥跑路了，于是只能自己硬着头皮去解决这些问题，有些路还是需要自己去蹚一下。否则永远都是个弟弟


## CComObject
com本来就是我的弱点，但是工程中还是用到了。
工程中新建了一个模块，需要用到一个很简单的com智能指针对象,就下面这句话，结果却崩溃了。。。
```c++
    CComObject<CMyObject>::CreateInstance(&m_pMsgCallback);
```

通过调试发现最后崩溃的代码是ATL的代码中
```c++
    CComObject(void* = NULL) throw()
    {
        _pAtlModule->Lock();    // 崩溃的代码
    }
```

同样的代码在别的模块里面，却能完美的运行，百思不得其解。好好的_pAtlModule为啥会是空指针呢？

## 求索
无奈，先google下吧，结果还真找到了相关的问题,其中一个帖子中，看到了一个大佬这样的回复
```c++
    Have you got an answer? Here is my solution:
    _pAtlModule is declared in <atlbase.h>. We should supply a CComModule object and assign to it. So in your main.cpp or the file where you create MyClass ATL object, put this code at the front:

    CComModule _Module;
    extern __declspec(selectany) CAtlModule* _pAtlModule=&_Module;

    Then create MyClass object using the methods instructed in Reference (2) below.

    References:
    (1) Exception in _pAtlModule->Lock():
        http://dzolee.blogspot.com/2007/10/exception-in-patlmodule-lock.html
    (2) How to create ATL COM objects in Visual C++
        http://support.microsoft.com/kb/181265

    Hope it works for you!
```

当然，最重要的就是这句话了
```c++
    CComModule _Module;
    extern __declspec(selectany) CAtlModule* _pAtlModule=&_Module;
```

突然恍然大悟，之前的模块中不就看到这这句代码么，只是一直不明白，为何要写这么一句话！！！