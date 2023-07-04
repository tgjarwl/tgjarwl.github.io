---
layout: post
title: 基于wmi中__InstanceOperationEvent类实现的异步监控
date: 2023-07-04
tags: wmi
---

## Life
最近一直在搞数据库和应用弱密码的事情，搞得脑子都要崩溃了，还是搞一些喜欢的东西，比较有意思。


## __InstanceOperationEvent 类
__InstanceOperationEvent 这个类可以通过wmi监控系统里面发生的一些事件，很早之前便想着写一个基于 这个类的监控，这两天终于还是给写出来了。主要包括下面三部分，这里只是拿__InstanceCreationEvent举例说明，当然能监控的事情远不止于此，有时候如果只是为了感知一些事情的发生，而不想上驱动的话，这应该是一个不错的选择。
```
__InstanceCreationEvent
__InstanceModificationEvent
__InstanceDeletionEvent
```

## 直接贴代码吧
实在懒得去写一些解释说明什么的了，下面直接贴代码跟输出吧。


## EventSink.h
```c++
#ifndef EVENTSINK_H
#define EVENTSINK_H

#define _WIN32_DCOM
#include <iostream>
using namespace std;
#include <comdef.h>
#include <Wbemidl.h>

#pragma comment(lib, "wbemuuid.lib")


// 启用监控 & 停止监控
HRESULT BeginMonitor();
BOOL StopMonitor();


#endif    // end of EventSink.h
```

## EventSink.cpp
```c++
#include "stdafx.h"
#include "EventSink.h"

// 内部类，勿用
class EventSink : public IWbemObjectSink
{
    LONG m_lRef;
    bool bDone;

public:
    EventSink() { m_lRef = 0; }
    ~EventSink() { bDone = true; }

    virtual ULONG STDMETHODCALLTYPE AddRef();
    virtual ULONG STDMETHODCALLTYPE Release();
    virtual HRESULT
        STDMETHODCALLTYPE QueryInterface(REFIID riid, void** ppv);

    virtual HRESULT STDMETHODCALLTYPE Indicate(
        LONG lObjectCount,
        IWbemClassObject __RPC_FAR *__RPC_FAR *apObjArray
    );

    virtual HRESULT STDMETHODCALLTYPE SetStatus(
        /* [in] */ LONG lFlags,
        /* [in] */ HRESULT hResult,
        /* [in] */ BSTR strParam,
        /* [in] */ IWbemClassObject __RPC_FAR *pObjParam
    );
};

ULONG EventSink::AddRef()
{
    return InterlockedIncrement(&m_lRef);
}

ULONG EventSink::Release()
{
    LONG lRef = InterlockedDecrement(&m_lRef);
    if (lRef == 0)
        delete this;
    return lRef;
}

HRESULT EventSink::QueryInterface(REFIID riid, void** ppv)
{
    if (riid == IID_IUnknown || riid == IID_IWbemObjectSink)
    {
        *ppv = (IWbemObjectSink *)this;
        AddRef();
        return WBEM_S_NO_ERROR;
    }
    else return E_NOINTERFACE;
}


HRESULT EventSink::Indicate(long lObjectCount,
    IWbemClassObject **apObjArray)
{
    HRESULT hres = S_OK;

    for (int i = 0; i < lObjectCount; i++)
    {
        printf("Event occurred\n");
        DWORD dwPropertyCount = 0;
        DbgTrace(L"[EnumWmiObject] in");
        IWbemClassObject *pObj = apObjArray[i];
        if (pObj)
        {
            VARIANT vCount;
            VariantInit(&vCount);

            if (pObj->Get( L"__PROPERTY_COUNT", 0, &vCount, 0, 0) == S_OK &&
                vCount.vt == VT_I4)
            {
                dwPropertyCount = vCount.intVal;
            }

            VARIANT vInstance;
            VariantInit(&vInstance);

            if (pObj->Get(L"TargetInstance", 0, &vInstance, 0, 0) == S_OK )
            {
                
                IWbemClassObject * pInstance = (IWbemClassObject*)vInstance.punkVal;

                VARIANT vExecutablePath;
                VariantInit(&vExecutablePath);
                if (pInstance->Get(L"ExecutablePath", 0, &vExecutablePath, 0, 0) == S_OK)
                {
                    DbgTrace(L"[EnumWmiObject] exe path: %s", vExecutablePath.bstrVal);
                    VariantClear(&vExecutablePath);
                }

                VariantClear(&vInstance);
            }

            BSTR strObjectName = NULL;
            if (/*dwPropertyCount &&*/
                pObj->GetObjectText(0, &strObjectName) == S_OK &&
                strObjectName)
            {
                
                DbgTrace(L"[EnumWmiObject] object text: %s", strObjectName);
                SysFreeString(strObjectName);
            }
        }
    }

    return WBEM_S_NO_ERROR;
}

HRESULT EventSink::SetStatus(
    /* [in] */ LONG lFlags,
    /* [in] */ HRESULT hResult,
    /* [in] */ BSTR strParam,
    /* [in] */ IWbemClassObject __RPC_FAR *pObjParam
)
{
    if (lFlags == WBEM_STATUS_COMPLETE)
    {
        printf("Call complete. hResult = 0x%X\n", hResult);
    }
    else if (lFlags == WBEM_STATUS_PROGRESS)
    {
        printf("Call in progress.\n");
    }

    return WBEM_S_NO_ERROR;
}    // end of EventSink.cpp

IWbemLocator *              g_pLoc = NULL;
IWbemServices *             g_pSvc = NULL;
IUnsecuredApartment*        g_pUnsecApp = NULL;
EventSink*                  g_pSink = NULL;
IUnknown*                   g_pStubUnk = NULL;
IWbemObjectSink*            g_pStubSink = NULL;

HRESULT BeginMonitor()
{
    HRESULT hres = S_FALSE;

    hres = CoInitializeEx(0, COINIT_MULTITHREADED);
    if (FAILED(hres))
    {
        return hres;
    }

    do
    {
        hres = CoInitializeSecurity(
            NULL,
            -1,                          // COM negotiates service
            NULL,                        // Authentication services
            NULL,                        // Reserved
            RPC_C_AUTHN_LEVEL_DEFAULT,   // Default authentication 
            RPC_C_IMP_LEVEL_IMPERSONATE, // Default Impersonation  
            NULL,                        // Authentication info
            EOAC_NONE,                   // Additional capabilities 
            NULL                         // Reserved
        );
        if (FAILED(hres))
        {
            break;
        }

        hres = CoCreateInstance( CLSID_WbemLocator, 0, CLSCTX_INPROC_SERVER, IID_IWbemLocator, (LPVOID *)&g_pLoc);
        if (FAILED(hres))
        {
            break;
        }

        hres = g_pLoc->ConnectServer( _bstr_t(L"ROOT\\CIMV2"), NULL, NULL, 0, NULL, 0, 0, &g_pSvc);
        if (FAILED(hres))
        {
            break;
        }

        hres = CoSetProxyBlanket(
            g_pSvc,                        // Indicates the proxy to set
            RPC_C_AUTHN_WINNT,           // RPC_C_AUTHN_xxx 
            RPC_C_AUTHZ_NONE,            // RPC_C_AUTHZ_xxx 
            NULL,                        // Server principal name 
            RPC_C_AUTHN_LEVEL_CALL,      // RPC_C_AUTHN_LEVEL_xxx 
            RPC_C_IMP_LEVEL_IMPERSONATE, // RPC_C_IMP_LEVEL_xxx
            NULL,                        // client identity
            EOAC_NONE                    // proxy capabilities 
        );
        if (FAILED(hres))
        {
            break;
        }

        

        hres = CoCreateInstance(CLSID_UnsecuredApartment, NULL,
            CLSCTX_LOCAL_SERVER, IID_IUnsecuredApartment,
            (void**)&g_pUnsecApp);

        g_pSink = new EventSink;
        g_pSink->AddRef();

        g_pUnsecApp->CreateObjectStub(g_pSink, &g_pStubUnk);

        g_pStubUnk->QueryInterface(IID_IWbemObjectSink, (void **)&g_pStubSink);

        hres = g_pSvc->ExecNotificationQueryAsync(
            _bstr_t("WQL"),
            _bstr_t("SELECT * FROM __InstanceCreationEvent WITHIN 1 WHERE TargetInstance ISA 'Win32_Process'"),
            WBEM_FLAG_SEND_STATUS,
            NULL,
            g_pStubSink);
        if (FAILED(hres))
        {
            break;
        }

    } while (FALSE);

    return hres;
}

BOOL StopMonitor()
{
    if (g_pStubSink && g_pSvc)
    {
        g_pSvc->CancelAsyncCall(g_pStubSink);
        g_pSvc->Release();
    }
    if (g_pLoc)
    {
        g_pLoc->Release();
    }
    
    if (g_pUnsecApp)
    {
        g_pUnsecApp->Release();
    }
    
    if (g_pStubUnk)
    {
        g_pStubUnk->Release();
    }

    if (g_pSink)
    {
        g_pSink->Release();
    }
    
    if (g_pStubSink)
    {
        g_pStubSink->Release();
    }

    CoUninitialize();
    return TRUE;
}
```

## 用法
```c++
int main()
{
    BeginMonitor();
 
    system("pause");

    StopMonitor();
    return 0;
}
```


## 输出
输出见下面的内容，可以看到内容还是很丰富的，当然，随着监控的不同，输出的内容也会不一样，理论上通过这个东西搞个edr，也是木有问题。需要特别注意的是，有些监控点需要管理员权限
```c++
[31788] e:\project\test\test\eventsink.cpp(91) : atlTraceGeneral - [EnumWmiObject] exe path: C:\Users\tgjarwl\AppData\Roaming\360safe\SoftMgr\MultiTip.exe
[31788] e:\project\test\test\eventsink.cpp(104) : atlTraceGeneral - [EnumWmiObject] object text: 
[31788] instance of __InstanceCreationEvent
[31788] {
[31788]  TargetInstance = 
[31788] instance of Win32_Process
[31788] {
[31788]  Caption = "MultiTip.exe";
[31788]  CommandLine = "\"C:\\Users\\tgjarwl\\AppData\\Roaming\\360safe\\SoftMgr\\MultiTip.exe\" dl=10 timeout=300 /globalspan=1500 /Message= ......";
[31788]  CreationClassName = "Win32_Process";
[31788]  CreationDate = "20230704082910.951188+480";
[31788]  CSCreationClassName = "Win32_ComputerSystem";
[31788]  CSName = "2SCDJH3";
[31788]  Description = "MultiTip.exe";
[31788]  ExecutablePath = "C:\\Users\\tgjarwl\\AppData\\Roaming\\360safe\\SoftMgr\\MultiTip.exe";
[31788]  Handle = "24408";
[31788]  HandleCount = 242;
[31788]  KernelModeTime = "156250";
[31788]  MaximumWorkingSetSize = 1380;
[31788]  MinimumWorkingSetSize = 200;
[31788]  Name = "MultiTip.exe";
[31788]  OSCreationClassName = "Win32_OperatingSystem";
[31788]  OSName = "Microsoft Windows 10 专业版|C:\\windows|\\Device\\Harddisk1\\Partition3";
[31788]  OtherOperationCount = "939";
[31788]  OtherTransferCount = "41988";
[31788]  PageFaults = 6101;
[31788]  PageFileUsage = 10988;
[31788]  ParentProcessId = 33380;
[31788]  PeakPageFileUsage = 10988;
[31788]  PeakVirtualSize = "113082368";
[31788]  PeakWorkingSetSize = 22016;
[31788]  Priority = 8;
[31788]  PrivatePageCount = "11251712";
[31788]  ProcessId = 24408;
[31788]  QuotaNonPagedPoolUsage = 20;
[31788]  QuotaPagedPoolUsage = 180;
[31788]  QuotaPeakNonPagedPoolUsage = 20;
[31788]  QuotaPeakPagedPoolUsage = 180;
[31788]  ReadOperationCount = "792";
[31788]  ReadTransferCount = "28451563";
[31788]  SessionId = 7;
[31788]  ThreadCount = 6;
[31788]  UserModeTime = "2187500";
[31788]  VirtualSize = "112099328";
[31788]  WindowsVersion = "10.0.19042";
[31788]  WorkingSetSize = "22540288";
[31788]  WriteOperationCount = "0";
[31788]  WriteTransferCount = "0";
[31788] };
[31788]  TIME_CREATED = "133329041512191254";
[31788] };

```
