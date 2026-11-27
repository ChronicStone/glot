import { Text, isVNode } from 'vue'
import type { ComponentInternalInstance, VNode } from 'vue'
import { TRANSLATED_ATTRIBUTES } from '../constants/widget.constants.ts'
import type { PageNode } from '../types/widget.types.ts'

function ownerOf(vnode: VNode): ComponentInternalInstance | null {
  return Reflect.get(vnode, 'ctx') ?? null
}

function attributeNodes(options: { vnode: VNode; element: Element }) {
  const props = options.vnode.props ?? {}

  return Object.values(TRANSLATED_ATTRIBUTES).flatMap((attribute) => {
    const value: unknown = props[attribute]

    return typeof value === 'string' && value.trim()
      ? [{ node: options.element, owner: ownerOf(options.vnode), attribute, text: value }]
      : []
  })
}

function elementNodes(vnode: VNode): PageNode[] {
  const element = vnode.el

  if (!(element instanceof Element)) {
    return []
  }

  const nodes: PageNode[] = attributeNodes({ vnode, element })
  const html: unknown = vnode.props?.innerHTML
  const first = element.firstChild

  if (typeof html === 'string') {
    nodes.push({
      node: element,
      owner: ownerOf(vnode),
      attribute: null,
      text: element.textContent ?? '',
    })
  } else if (typeof vnode.children === 'string' && first instanceof globalThis.Text) {
    nodes.push({ node: first, owner: ownerOf(vnode), attribute: null, text: first.data })
  }

  return nodes
}

export function collectPageNodes(vnode: VNode): PageNode[] {
  if (vnode.component) {
    return collectPageNodes(vnode.component.subTree)
  }

  if (vnode.suspense) {
    return vnode.suspense.activeBranch ? collectPageNodes(vnode.suspense.activeBranch) : []
  }

  if (vnode.type === Text) {
    return vnode.el instanceof globalThis.Text
      ? [{ node: vnode.el, owner: ownerOf(vnode), attribute: null, text: vnode.el.data }]
      : []
  }

  const own = typeof vnode.type === 'string' ? elementNodes(vnode) : []
  const children = Array.isArray(vnode.children) ? vnode.children : []

  return [...own, ...children.flatMap((child) => (isVNode(child) ? collectPageNodes(child) : []))]
}
