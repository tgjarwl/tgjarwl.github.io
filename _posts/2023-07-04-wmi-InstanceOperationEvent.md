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

关于event的详细情况，可以看我之前的一篇文章 wmi-event， https://tgjarwl.github.io/2021/07/wmi-event/  ， 这两篇文章是绝配的
```

## 直接贴代码吧
实在懒得去写一些解释说明什么的了，下面直接贴代码跟输出吧。


## EventSink.h
```c++
#pragma once
#include <comdef.h>
#include <Wbemidl.h>

/*
    用法：
        EventSink 的定义和用法，见cpp文件开头

        例如监控共享目录的变化
        EventSink *pEventSink = new EventSink();
        Start("SELECT * FROM __InstanceOperationEvent WITHIN 1 WHERE TargetInstance ISA 'Win32_Share'", pEventSink);
*/

// 这是一个 EventSink 的示例
class EventSink : public IWbemObjectSink
{
    LONG m_lRef;
    bool bDone;

public:
    EventSink() { m_lRef = 0; }
    ~EventSink() { bDone = true; }

    virtual ULONG   STDMETHODCALLTYPE AddRef();
    virtual ULONG   STDMETHODCALLTYPE Release();
    virtual HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void** ppv);
    virtual HRESULT STDMETHODCALLTYPE Indicate(LONG lObjectCount,IWbemClassObject __RPC_FAR *__RPC_FAR *apObjArray );
    virtual HRESULT STDMETHODCALLTYPE SetStatus(LONG lFlags,HRESULT hResult,BSTR strParam,IWbemClassObject __RPC_FAR *pObjParam);
};

class CWmiMonitor
{
public:
    CWmiMonitor();
    ~CWmiMonitor();

public:
    HRESULT Start(LPCWSTR lpMonitorStr, IUnknown *pEventSink);
    BOOL Stop();

private:
    IWbemLocator *              m_pWbemLoc;
    IWbemServices *             m_pCimSvc;
    IUnsecuredApartment*        m_pUnsecApp;
    IUnknown*                   m_pEventSink;
    IUnknown*                   m_pStubUnk;

    IWbemObjectSink*            m_pSinkInst;
};
```

## EventSink.cpp
```c++
#include "stdafx.h"
#include "Win.Wmi.Monitor.h"

#pragma comment(lib, "wbemuuid.lib")

ULONG __stdcall EventSink::AddRef()
{
    return InterlockedIncrement(&m_lRef);
}

ULONG __stdcall EventSink::Release()
{
    LONG lRef = InterlockedDecrement(&m_lRef);
    if (lRef == 0)
    {
        delete this;
    }

    return lRef;
}

HRESULT __stdcall EventSink::QueryInterface(REFIID riid, void** ppv)
{
    if (riid == IID_IUnknown || riid == IID_IWbemObjectSink)
    {
        *ppv = (IWbemObjectSink *)this;
        AddRef();
        return WBEM_S_NO_ERROR;
    }
    return E_NOINTERFACE;
}

HRESULT __stdcall EventSink::Indicate(LONG lObjectCount, IWbemClassObject ** apObjArray)
{
    HRESULT hres = S_OK;

    for (int i = 0; i < lObjectCount; i++)
    {
        DWORD dwPropertyCount = 0;
        ATLTRACE(L"[%s] called", __FUNCTIONW__);
        IWbemClassObject *pObj = apObjArray[i];
        if (pObj)
        {
            VARIANT vCount;
            VariantInit(&vCount);

            if (pObj->Get(L"__PROPERTY_COUNT", 0, &vCount, 0, 0) == S_OK &&
                vCount.vt == VT_I4)
            {
                dwPropertyCount = vCount.intVal;
            }

            BSTR strObjectName = NULL;
            if (/*dwPropertyCount &&*/
                pObj->GetObjectText(0, &strObjectName) == S_OK &&
                strObjectName)
            {

                ATLTRACE(L"[%s] object text: %s", __FUNCTIONW__, strObjectName);
                SysFreeString(strObjectName);
            }
        }
    }

    return WBEM_S_NO_ERROR;
}

HRESULT __stdcall EventSink::SetStatus(LONG lFlags, HRESULT hResult, BSTR strParam, IWbemClassObject __RPC_FAR *pObjParam)
{
    if (lFlags == WBEM_STATUS_COMPLETE)
    {
        ATLTRACE(L"[%s] Call complete. hResult = 0x%X", __FUNCTIONW__, hResult);
    }
    else if (lFlags == WBEM_STATUS_PROGRESS)
    {
        ATLTRACE(L"[%s] Call in progress.", __FUNCTIONW__);
    }

    return WBEM_S_NO_ERROR;
}



CWmiMonitor::CWmiMonitor()
{
    m_pWbemLoc = NULL;
    m_pCimSvc = NULL;
    m_pUnsecApp = NULL;
    m_pEventSink = NULL;
    m_pStubUnk = NULL;

    m_pSinkInst = NULL;
}

CWmiMonitor::~CWmiMonitor()
{
}

HRESULT CWmiMonitor::Start(LPCWSTR lpMonitorStr, IUnknown *pEventSink)
{
    HRESULT hres = S_FALSE;

    if (pEventSink == NULL)
    {
        ATLTRACE(L"[%s] invalid param event sink !!!(0x%08x)!!!", __FUNCTIONW__, hres);
        return hres;
    }

    hres = CoInitializeEx(0, COINIT_MULTITHREADED);
    if (FAILED(hres))
    {
        ATLTRACE(L"[%s]co init failed(0x%08x)!!!", __FUNCTIONW__, hres);
        return hres;
    }

    do
    {
        hres = CoInitializeSecurity( NULL, -1, NULL, NULL, RPC_C_AUTHN_LEVEL_DEFAULT, RPC_C_IMP_LEVEL_IMPERSONATE, NULL, EOAC_NONE, NULL );
        if (FAILED(hres))
        {
            ATLTRACE(L"[%s] CoInitializeSecurity failed(0x%08x)!!!", __FUNCTIONW__, hres);
            break;
        }

        hres = CoCreateInstance(CLSID_WbemLocator, 0, CLSCTX_INPROC_SERVER, IID_IWbemLocator, (LPVOID *)&m_pWbemLoc);
        if (FAILED(hres))
        {
            ATLTRACE(L"[%s] CLSID_WbemLocator failed(0x%08x)!!!", __FUNCTIONW__, hres);
            break;
        }

        hres = m_pWbemLoc->ConnectServer(_bstr_t(L"ROOT\\CIMV2"), NULL, NULL, 0, NULL, 0, 0, &m_pCimSvc);
        if (FAILED(hres))
        {
            ATLTRACE(L"[%s] root cimv2 failed(0x%08x)!!!", __FUNCTIONW__, hres);
            break;
        }

        hres = CoSetProxyBlanket( m_pCimSvc, RPC_C_AUTHN_WINNT, RPC_C_AUTHZ_NONE, NULL, RPC_C_AUTHN_LEVEL_CALL, RPC_C_IMP_LEVEL_IMPERSONATE, NULL, EOAC_NONE );
        if (FAILED(hres))
        {
            ATLTRACE(L"[%s] CoSetProxyBlanket failed(0x%08x)!!!", __FUNCTIONW__, hres);
            break;
        }


        hres = CoCreateInstance(CLSID_UnsecuredApartment, NULL, CLSCTX_LOCAL_SERVER, IID_IUnsecuredApartment, (void**)&m_pUnsecApp);
        if (FAILED(hres))
        {
            ATLTRACE(L"[%s] CLSID_UnsecuredApartment failed(0x%08x)!!!", __FUNCTIONW__, hres);
            break;
        }

        m_pEventSink = pEventSink;
        m_pEventSink->AddRef();

        hres = m_pUnsecApp->CreateObjectStub(m_pEventSink, &m_pStubUnk);
        if (FAILED(hres))
        {
            ATLTRACE(L"[%s] m_pStubUnk failed(0x%08x)!!!", __FUNCTIONW__, hres);
            break;
        }

        hres = m_pStubUnk->QueryInterface(IID_IWbemObjectSink, (void **)&m_pSinkInst);
        if (FAILED(hres))
        {
            ATLTRACE(L"[%s] IID_IWbemObjectSink failed(0x%08x)!!!", __FUNCTIONW__, hres);
            break;
        }

        // query string sample "SELECT * FROM __InstanceOperationEvent WITHIN 1 WHERE TargetInstance ISA 'Win32_Share'"
        hres = m_pCimSvc->ExecNotificationQueryAsync(
            _bstr_t("WQL"),
            _bstr_t(lpMonitorStr),
            WBEM_FLAG_SEND_STATUS,
            NULL,
            m_pSinkInst);
        if (FAILED(hres))
        {
            ATLTRACE(L"[%s] ExecNotificationQueryAsync failed(0x%08x)!!!", __FUNCTIONW__, hres);
            break;
        }

        ATLTRACE(L"[%s] monitor [%s] success", __FUNCTIONW__, lpMonitorStr);
        return hres;
    } while (FALSE);

    Stop();
    return hres;
}

BOOL CWmiMonitor::Stop()
{
    if (m_pSinkInst && m_pCimSvc)
    {
        m_pCimSvc->CancelAsyncCall(m_pSinkInst);
        m_pCimSvc->Release();
    }
    if (m_pWbemLoc)
    {
        m_pWbemLoc->Release();
    }

    if (m_pUnsecApp)
    {
        m_pUnsecApp->Release();
    }

    if (m_pStubUnk)
    {
        m_pStubUnk->Release();
    }

    if (m_pEventSink)
    {
        m_pEventSink->Release();
    }

    if (m_pSinkInst)
    {
        m_pSinkInst->Release();
    }

    CoUninitialize();

    return TRUE;
}

```

## 用法
```c++
int main()
{
    EventSink *pEventSink = new EventSink();
    CWmiMonitor m_shareMonitor;
    m_shareMonitor.Start("SELECT * FROM __InstanceOperationEvent WITHIN 1 WHERE TargetInstance ISA 'Win32_Share'", pEventSink);
 
    system("pause");
    m_shareMonitor.Stop();
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

## 后记
比如想监控共享目录的变更，则可以按照下的方式修改下 sql 语句即可
```c++
hres = g_pSvc->ExecNotificationQueryAsync(
            _bstr_t("WQL"),
            _bstr_t("SELECT * FROM __InstanceOperationEvent WITHIN 1 WHERE TargetInstance ISA 'Win32_Share'"),
            WBEM_FLAG_SEND_STATUS,
            NULL,
            g_pStubSink);

下面是监控到的输出信息：
[7788] e:\project\test\test\eventsink.cpp(66) : atlTraceGeneral - [EnumWmiObject] in
[7788] e:\project\test\test\eventsink.cpp(85) : atlTraceGeneral - [EnumWmiObject] object text: 
[7788] instance of __InstanceDeletionEvent
[7788] {
[7788]  TargetInstance = 
[7788] instance of Win32_Share
[7788] {
[7788]  AllowMaximum = TRUE;
[7788]  Caption = "Docs";
[7788]  Description = "";
[7788]  Name = "Docs";
[7788]  Path = "E:\\test";
[7788]  Status = "OK";
[7788]  Type = 0;
[7788] };
[7788]  TIME_CREATED = "133329082346092102";
[7788] };

```
