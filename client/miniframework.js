/**
 * @file vdom-framework.js
 * @description
 * A lightweight Virtual DOM framework for rendering and diffing DOM elements,
 * managing global state, handling routing, and managing event listeners.
 *
 * Main Features:
 * - createVDOM: Create a virtual DOM node.
 * - render: Convert virtual DOM to real DOM.
 * - diffing: Efficiently update the DOM using diffing.
 * - StateManagement: Global state storage with listener support and localStorage persistence.
 * - renderComponent: Handle rendering and re-rendering of VDOM-based components.
 * - Routing: Client-side route management via history API.
 * - EventSystem: Delegated event listener system with automatic cleanup.
 *
 * Exports:
 * - createVDOM
 * - route
 * - handleLocation
 * - setRoutes
 * - setRoot
 * - StateManagement
 * - EventSystem
 * - renderComponent
 */

// ------------------ Virtual DOM ------------------

/**
 * Creates a virtual DOM node.
 * @param {string} tag - HTML tag name (e.g., "div").
 * @param {Object} attrs - Attributes like id, class, onClick, etc.
 * @param {Array} children - Nested virtual DOM nodes or strings.
 * @returns {Object} A VDOM node.
 */
function vdm(tag, attrs, ...children) {
  if (typeof tag === "function") {
    return tag({ ...attrs, children });
  }
  return { tag, attrs: attrs || {}, children: children.flat() };
}

/**
* Converts a virtual DOM node to an actual DOM element.
* @param {Object|string} vDOM - Virtual DOM or string.
* @returns {Node} A DOM Node (HTMLElement or TextNode).
*/
function render(vDOM) {
  if (!vDOM) return document.createComment("Empty node");
  if (typeof vDOM === "string") return document.createTextNode(vDOM);
  if (!vDOM.tag) return document.createComment("Invalid VDOM node");

  const element = document.createElement(vDOM.tag);

  for (const key in vDOM.attrs) {
    if (key === "ref" && typeof vDOM.attrs[key] === "function") {
      setTimeout(() => vDOM.attrs[key](element), 0);
    } else if (key.startsWith("on")) {
      const event = key.toLowerCase().slice(2);
      EventSystem.add(element, event, vDOM.attrs[key]);
    } else if (key === "checked") {
      element.checked = vDOM.attrs[key];
    } else if (key === "style" && typeof vDOM.attrs[key] === "object") {
      const styleObj = vDOM.attrs[key];
      for (const prop in styleObj) {
        element.style[prop] = styleObj[prop];
      }
    } else {
      element.setAttribute(key, vDOM.attrs[key]);
    }
  }

  vDOM.children.forEach(child => {
    element.appendChild(render(child));
  });
  return element;
}

export let rootElement = null;

/**
* Sets the root element where components will render.
* @param {string} elementId - ID of the root DOM element.
*/
function setRoot(elementId) {
  let rot = document.getElementById(elementId)
  if (!rot) throw new Error(`root elemnt not found [${elementId}]`)
  if (rot != rootElement) {
    currentComponent = null
  }
  rootElement = rot;
}

let currentComponent = null;

/**
* Diffs two virtual DOM trees and updates the real DOM.
* @param {HTMLElement} root - Root DOM node.
* @param {Object|string} oldVDOM - Previous virtual DOM.
* @param {Object|string} newVDOM - New virtual DOM.
* @param {number} index - Child index in the parent node.
*/
function diffing(root, oldVDOM, newVDOM, index = 0) {
  const currentChild = root.childNodes[index];

  // over handling
  if (!newVDOM && !oldVDOM) return;

  if (!newVDOM) {
    if (currentChild) root.removeChild(currentChild);
    return;
  }
  if (!oldVDOM) {
    root.appendChild(render(newVDOM));
    return;
  }

  if (typeof newVDOM === "string" || typeof oldVDOM === "string") {
    if (typeof newVDOM === "string" && typeof oldVDOM === "string") {
      if (newVDOM !== oldVDOM && currentChild) currentChild.textContent = newVDOM;
    } else if (currentChild) {
      root.replaceChild(render(newVDOM), currentChild);
    } else {
      root.appendChild(render(newVDOM));
    }
    return;
  }

  if (newVDOM.tag !== oldVDOM.tag) {
    if (currentChild) root.replaceChild(render(newVDOM), currentChild);
    else root.appendChild(render(newVDOM));
    return;
  }
  if (currentChild && currentChild.nodeType === Node.ELEMENT_NODE) {
    for (const attr in newVDOM.attrs) {
      if (attr === "checked") {
        if (currentChild.checked !== newVDOM.attrs[attr]) {
          currentChild.checked = newVDOM.attrs[attr];
        }
      } else if (attr === "ref" && typeof newVDOM.attrs[attr] === "function") {
        try {
          newVDOM.attrs[attr](currentChild);
        } catch (e) {
          console.error("Ref callback error:", e);
        }
      } else if (attr === "style" && typeof newVDOM.attrs[attr] === "object") {
        const styleObj = newVDOM.attrs[attr];
        for (const prop in styleObj) {
          currentChild.style[prop] = styleObj[prop];
        }
      } else if (newVDOM.attrs[attr] !== oldVDOM.attrs[attr]) {
        if (attr.startsWith("on")) {
          const event = attr.toLowerCase().slice(2);
          EventSystem.remove(currentChild, event, oldVDOM.attrs[attr]);
          EventSystem.add(currentChild, event, newVDOM.attrs[attr]);
        } else {
          currentChild.setAttribute(attr, newVDOM.attrs[attr]);
        }
      }
    }

    for (const attr in oldVDOM.attrs) {
      try {
        if (!newVDOM.attrs[attr] && attr !== "ref") currentChild.removeAttribute(attr);
      } catch (error) {

      }
    }
  }

  const oldChildren = oldVDOM.children || [];
  const newChildren = newVDOM.children || [];
  const maxLen = Math.max(oldChildren.length, newChildren.length);

  for (let i = 0; i < maxLen; i++) {
    diffing(currentChild, oldChildren[i], newChildren[i], i);
  }

  // over handling
  if (oldChildren.length > newChildren.length && currentChild) {
    for (let i = oldChildren.length - 1; i >= newChildren.length; i--) {
      if (i < currentChild.childNodes.length) {
        if(currentChild.id == "current-player"){
          console.log(currentChild);
        }
        currentChild.removeChild(currentChild.childNodes[i]);
      }
    }
  }
}

let haveNewState = false;

/**
* Renders a component and handles diffing if already rendered.
* @param {Function} component - A function returning a virtual DOM.
*/
function renderComponent(component, isNwPath = false) {
  // if (haveNewState) {
  //   EventSystem.cleanAll();
  //   haveNewState = false;
  // }

  if (!rootElement) {
    console.error("Root element is not set. Call setRoot(elementId).");
    return;
  }

  const newVDOM = component();

  if (currentComponent === null || isNwPath) {
    currentComponent = newVDOM;
    rootElement.innerHTML = "";
    rootElement.appendChild(render(newVDOM));
  } else {
    diffing(rootElement, currentComponent, newVDOM);
    currentComponent = newVDOM;
  }
}

let globalRoutes = {};
/**
* Sets available routes.
* @param {Object} routes - Object of path -> component mappings.
*/
function setRoutes(routes) {
  globalRoutes = routes;
}

// ------------------ Global State Management ------------------
const StateManagement = {
  state: {},
  listeners: [],

  notify() {
    this.listeners.forEach(listener => listener(this.state));
  },

  get() {
    return this.state;
  },

  set(newState) {
    if (newState !== this.state) haveNewState = true;
    this.state = { ...this.state, ...newState };
    this.notify();
  },

  delete(key) {
    if (this.state.hasOwnProperty(key)) {
      delete this.state[key];
      this.notify();
    }
  },

  reset() {
    localStorage.removeItem("myState");
    this.state = {};
    this.notify();
  },

  /**
   * Subscribes a listener to state changes.
   * @param {Function} listener - Function to call on state change.
   * @returns {Function} Unsubscribe function.
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
};

// const StateManagement = (() => {
//   let state = {};
//   let listeners = [];
//   let abortController = new AbortController();

//   return {
//     state,
    
//     notify() {
//       abortController.abort();
//       abortController = new AbortController();
      
//       const signal = abortController.signal;
//       const currentState = this.state;
      
//       listeners.forEach(listener => {
//         if (signal.aborted) return;
//         try {
//           listener(currentState);
//         } catch (error) {
//           if (!signal.aborted) console.error('Listener error:', error);
//         }
//       });
//     },

//     get() {
//       return this.state;
//     },

//     set(newState) {
//       if (newState !== this.state) {
//         this.state = { ...this.state, ...newState };
//         this.notify();
//       }
//     },

//     delete(key) {
//       if (this.state.hasOwnProperty(key)) {
//         delete this.state[key];
//         this.notify();
//       }
//     },

//     reset() {
//       localStorage.removeItem("myState");
//       this.state = {};
//       this.notify();
//     },

//     subscribe(listener) {
//       listeners.push(listener);
//       return () => {
//         listeners = listeners.filter(l => l !== listener);
//       };
//     },
    
//     abortPending() {
//       abortController.abort();
//     }
//   };
// })();

// ------------------ Event System ------------------

const EventSystem = {
  events: {},
  eventListeners: {},

  add(element, eventType, handler, protect = false) {
    if (element === window || element === document) {
      if (!this.events[eventType]) {
        this.events[eventType] = [];
        element.addEventListener(eventType, handler);
      } else {
        this.events[eventType].push({ element, handler, protect });
      }
      return;
    }

    if (!this.events[eventType]) {
      this.events[eventType] = [];
      this.eventListeners[eventType] = (e) => this.handle(eventType, e);
      document.body.addEventListener(eventType, this.eventListeners[eventType], true);
    }

    this.events[eventType].push({ element, handler, protect });
  },

  remove(element, eventType, handler) {
    if (this.events[eventType]) {
      this.events[eventType] = this.events[eventType].filter(
        evtObj => !(evtObj.element === element && evtObj.handler === handler)
      );
      if (this.events[eventType].length === 0) {
        document.body.removeEventListener(eventType, this.eventListeners[eventType]);
        delete this.events[eventType];
        delete this.eventListeners[eventType];
      }
    }
  },

  cleanAll() {
    for (const eventType in this.events) {
      const protectedEvents = this.events[eventType].filter(event => event.protect);
      if (protectedEvents.length === 0) {
        document.body.removeEventListener(eventType, this.eventListeners[eventType]);
        delete this.events[eventType];
        delete this.eventListeners[eventType];
      } else {
        this.events[eventType] = protectedEvents;
      }
    }
  },

  handle(eventType, event) {
    if (!this.events[eventType]) return;
    this.events[eventType].forEach(({ element, handler }) => {
      if (element === event.target || element.contains(event.target)) {
        handler(event);
      }
    });
  }
};

// //==================== rachid router
class Router {
  constructor(renderFunction) {
    this.routes = {};
    this.render = renderFunction;
    this.notFoundComponent = null;
    this.currentPath = window.location.pathname;

    EventSystem.add(window, 'popstate', () => this.handleNavigation(), true)
    EventSystem.add(window, 'DOMContentLoaded', () => this.handleNavigation(), true)
  }

  add(path, component) {
    this.routes[path] = component;
    return this;
  }

  link(path) {
    if (this.currentPath === path) return;

    window.history.pushState({}, '', path);
    this.currentPath = path;
    this.handleNavigation();
  }

  setNotFound(component) {
    this.notFoundComponent = component;
    return this;
  }

  handleNavigation() {
    const path = window.location.pathname;
    this.currentPath = path;

    const component = this.routes[path] || this.notFoundComponent || this.defaultNotFound();

    this.render(component, true);
  }

  defaultNotFound() {
    return () => vdm("div", {},
      vdm("h1", {}, "404 - Page Not Found"),
      vdm("button", { onClick: () => this.link("/") }, "Go Home")
    );
  }
}

function getId(id, data = "", set = false, html = false) {
  if (set) {
    if (document.getElementById(id)) {
      (html) ? document.getElementById(id).innerHTML = data : document.getElementById(id).textContent = data
    }
  } else {
    return document.getElementById(id)
  }
}

export {
  vdm,
  setRoutes,
  setRoot,
  StateManagement,
  EventSystem,
  Router,
  renderComponent,
  getId
};