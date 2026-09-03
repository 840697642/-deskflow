'use client'

import Workbench from './workbench'

/** 兼容旧入口，实际数据加载和操作逻辑由正式 v0 Workbench 负责。 */
export default function WorkbenchContainer() {
  return <Workbench />
}
