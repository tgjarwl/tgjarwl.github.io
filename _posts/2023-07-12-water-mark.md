---
layout: post
title: 聊天软件水印
date: 2023-07-12
tags: [js,逆向开发]
---

## Life
有好多话想写，却又不知道该说些什么，直接上技术吧。

## 关于水印
公司的聊天软件，总是喜欢搞一些水印，对于一个正常的打工者来说，确实是很反感这些东西，于是乎，开搞，在旧版本的tt中，关键字是 water_mark， 如下图所示：
![avatar](/images/pages/2023_07_12_water_mark/water_mark_string.png)

通过查找引用，是直接可以找到关键代码的，如下图：
![avatar](/images/pages/2023_07_12_water_mark/water_mark_fix.png)

于是乎，旧版本的tt，就可以直接去掉水印了。 patch完，替换，完美。


## 架构变更
前两天，提示有新版本的更新，本来就已经跳过好几个版本了，于是就升级了，还是习惯性的动作，找到主程序，哎！！！ exe改名字了，新的exe 竟然 150M。这让我情何以堪。
![avatar](/images/pages/2023_07_12_water_mark/exe_size_diff.png)

这是吃激素了么，膨胀了这么多倍，不管有没有吃激素吧，该啃得骨头，不还是得啃么，既然ida看不了，那就 x64dbg 看看有没有关键字符串吧，结果，发现竟然毛都没有，以前是两个exe，现在还下了一群小的
![avatar](/images/pages/2023_07_12_water_mark/exe_tree.png)

调试关键字的时候，发现了，v8 chrome 相关的字样，心中万马奔腾，不会引入了一个 chrome的v8 引擎吧。现在都这么玩了么，打开 DIE 看了下，结果是真的这么玩了。
![avatar](/images/pages/2023_07_12_water_mark/DIE_show.png)

## electron
结合网上的两篇文章，大概搂了一眼，原来是node.js 搞出来的新的界面开发，关键是，里面的核心元素竟然是 chrome 内核，难怪那么大，随便一个hello world 都得100M起步。
```
下面是两篇关于 electron 的介绍
https://juejin.cn/post/6844904159104204814
https://bbs.kanxue.com/thread-270893.htm

```

于是乎，按着教程，安装，找到关键代码包，解包
```bat
Your environment has been set up for using Node.js 18.16.1 (x64) and npm.

C:\Users\tgjarwl>node -v
v18.16.1

C:\Users\tgjarwl>npm -v
9.5.1

C:\Users\tgjarwl>cd E:\project\tuitui

C:\Users\tgjarwl>e:

E:\project\tuitui>npm install asar -g
npm WARN deprecated asar@3.2.0: Please use @electron/asar moving forward.  There is no API change, just a package name change

added 17 packages in 16s

1 package is looking for funding
  run `npm fund` for details
npm notice
npm notice New minor version of npm available! 9.5.1 -> 9.8.0
npm notice Changelog: https://github.com/npm/cli/releases/tag/v9.8.0
npm notice Run npm install -g npm@9.8.0 to update!
npm notice

E:\project\tt>asar extract app.asar app

E:\project\tt>
```

解包后，在文件里面搜到了关键字，
![avatar](/images/pages/2023_07_12_water_mark/key_place.png)

当然，上面的截图只是为了说明位置，其实是有插入代码 mainWindow.webContents.openDevTools() 打开了开发者工具，然后找到的关键位置，然后用text编辑器直接修改的。

于是乎，修改后，再次封包，替换原来的文件
```bat
E:\project\tt>asar pack app app1.asar

E:\project\tt>
```

打开软件后，水印终于是没有了。

## 结尾
第一次接触 node.js 写客户端界面，确实挺好玩的，有时间得上手玩一下，不得不说，js越来越流行了。感觉在这么玩下去，js都可以写操作系统了

