import { HTML_NAMESPACE } from "./constants.js";
import { createNode } from "./createNode.js";
import { Fragment } from "./types.js";
import { updateAttributes } from "./utils.js";
/**
 * Applies the differences between the new virtual node(s) and the existing DOM.
 * @param parent The parent DOM node where the virtual nodes will be applied.
 * @param newVirtualNode A single virtual node or an array of virtual nodes.
 */
export function applyDiff(parent, newVirtualNode) {
    const newVNodes = Array.isArray(newVirtualNode)
        ? newVirtualNode
        : [newVirtualNode];
    diffChildren(parent, newVNodes);
}
/**
 * Flattens the list of virtual nodes by replacing Fragments with their children.
 * @param vnodes The array of virtual nodes to flatten.
 * @returns A new array of virtual nodes with Fragments flattened.
 */
function flattenVNodes(vnodes) {
    const flat = [];
    const arrayVNodes = vnodes;
    arrayVNodes.forEach((vnode) => {
        if (isFragment(vnode)) {
            const children = vnode.props.children ? vnode.props.children : [];
            flat.push(...children);
        }
        else {
            flat.push(vnode);
        }
    });
    return flat;
}
/**
 * Type guard to check if a VNode is a Fragment.
 * @param vnode The virtual node to check.
 * @returns True if vnode is a Fragment, false otherwise.
 */
function isFragment(vnode) {
    return typeof vnode === "object" && vnode !== null && vnode.type === Fragment;
}
/**
 * Diffs and updates the children of a DOM node based on the new virtual nodes.
 * @param parent The parent DOM node whose children will be diffed.
 * @param newVNodes An array of new virtual nodes.
 */
function diffChildren(parent, newVNodes) {
    const flattenedVNodes = flattenVNodes(newVNodes);
    const existingNodes = Array.from(parent.childNodes);
    const keyedMap = new Map();
    // Populate keyedMap with existing keyed nodes
    existingNodes.forEach((node) => {
        const key = node.__webjsx_key;
        if (key != null) {
            keyedMap.set(key, node);
        }
    });
    const newKeys = flattenedVNodes
        .filter(isVElementWithKey)
        .map((vnode) => vnode.props.key);
    existingNodes.forEach((node) => {
        const key = node.__webjsx_key;
        if (key != null && !newKeys.includes(key)) {
            parent.removeChild(node);
        }
    });
    flattenedVNodes.forEach((newVNode, i) => {
        const newKey = isVElement(newVNode) ? newVNode.props.key : undefined;
        let existingNode = null;
        if (newKey != null) {
            existingNode = keyedMap.get(newKey) || null;
        }
        if (!existingNode && newKey == null) {
            existingNode = parent.childNodes[i] || null;
        }
        if (existingNode) {
            if (existingNode !== parent.childNodes[i]) {
                parent.insertBefore(existingNode, parent.childNodes[i] || null);
            }
            updateNode(existingNode, newVNode);
        }
        else {
            const newDomNode = createNode(newVNode, getNamespaceURI(parent));
            if (isVElement(newVNode) && newVNode.props.key != null) {
                newDomNode.__webjsx_key = newVNode.props.key;
                newDomNode.setAttribute("data-key", String(newVNode.props.key));
            }
            parent.insertBefore(newDomNode, parent.childNodes[i] || null);
        }
    });
    const updatedChildNodes = Array.from(parent.childNodes);
    const newUnkeyed = flattenedVNodes.filter((vnode) => !isVElementWithKey(vnode));
    const existingUnkeyed = updatedChildNodes.filter((node) => !node.__webjsx_key);
    if (newUnkeyed.length < existingUnkeyed.length) {
        for (let i = newUnkeyed.length; i < existingUnkeyed.length; i++) {
            parent.removeChild(existingUnkeyed[i]);
        }
    }
}
/**
 * Updates a DOM node to match the new virtual node.
 * @param domNode The existing DOM node to be updated.
 * @param newVNode The new virtual node to apply.
 */
function updateNode(domNode, newVNode) {
    if (typeof newVNode === "string" ||
        typeof newVNode === "number" ||
        typeof newVNode === "boolean") {
        if (domNode.nodeType !== Node.TEXT_NODE ||
            domNode.textContent !== String(newVNode)) {
            const newTextNode = document.createTextNode(String(newVNode));
            domNode.parentNode?.replaceChild(newTextNode, domNode);
        }
        return;
    }
    if (newVNode.type === Fragment) {
        if (domNode instanceof DocumentFragment) {
            diffChildren(domNode, newVNode.props.children ? newVNode.props.children : []);
        }
        else {
            const fragment = document.createDocumentFragment();
            const children = newVNode.props.children ? newVNode.props.children : [];
            children.forEach((child) => {
                fragment.appendChild(createNode(child, undefined));
            });
            domNode.parentNode?.replaceChild(fragment, domNode);
        }
        return;
    }
    if (domNode instanceof HTMLElement &&
        domNode.tagName.toLowerCase() === newVNode.type.toLowerCase()) {
        const oldProps = domNode.__webjsx_props || {};
        const newProps = newVNode.props || {};
        updateAttributes(domNode, newProps, oldProps);
        if (isVElement(newVNode) && newVNode.props.key != null) {
            domNode.__webjsx_key = newVNode.props.key;
            domNode.setAttribute("data-key", String(newVNode.props.key));
        }
        else {
            delete domNode.__webjsx_key;
            domNode.removeAttribute("data-key");
        }
        if (newProps.ref) {
            assignRef(domNode, newProps.ref);
        }
        if (!newProps.dangerouslySetInnerHTML && newProps.children != null) {
            diffChildren(domNode, newProps.children);
        }
    }
    else {
        const newDomNode = createNode(newVNode, domNode.parentNode ? getNamespaceURI(domNode.parentNode) : undefined);
        if (isVElement(newVNode) && newVNode.props.key != null) {
            newDomNode.__webjsx_key = newVNode.props.key;
            newDomNode.setAttribute("data-key", String(newVNode.props.key));
        }
        if (isVElement(newVNode) && newVNode.props.ref) {
            assignRef(newDomNode, newVNode.props.ref);
        }
        domNode.parentNode?.replaceChild(newDomNode, domNode);
    }
}
/**
 * Assigns a ref to a node.
 * @param node The DOM node.
 * @param ref The ref to assign.
 */
function assignRef(node, ref) {
    const currentRef = node.__webjsx_assignedRef;
    // Only assign the ref if it's different
    if (currentRef !== ref) {
        if (typeof ref === "function") {
            ref(node);
        }
        else if (ref && typeof ref === "object") {
            ref.current = node;
        }
        // Store the assigned ref
        node.__webjsx_assignedRef = ref;
    }
}
/**
 * Type guard to check if a VNode is a VElement.
 * @param vnode The virtual node to check.
 * @returns True if vnode is a VElement, false otherwise.
 */
function isVElement(vnode) {
    return typeof vnode === "object" && vnode !== null && "props" in vnode;
}
/**
 * Type guard to check if a VNode is a VElement with a key.
 * @param vnode The virtual node to check.
 * @returns True if vnode is a VElement with a key, false otherwise.
 */
function isVElementWithKey(vnode) {
    return isVElement(vnode) && vnode.props.key != null;
}
function getNamespaceURI(node) {
    return node instanceof Element && node.namespaceURI !== HTML_NAMESPACE
        ? node.namespaceURI ?? undefined
        : undefined;
}
//# sourceMappingURL=applyDiff.js.map