#!/usr/bin/env python
# -*- coding: utf-8 -*-

import warnings
import sys

# 模拟一个警告
warnings.warn("这是一个测试警告信息", DeprecationWarning)

# 正常的脚本逻辑
print("脚本开始执行...")
print("当前Python版本:", sys.version)
print("脚本执行成功！")

# 计算一些简单的结果
result = sum(range(1, 11))
print(f"1到10的和是: {result}")

print("脚本执行完毕。") 