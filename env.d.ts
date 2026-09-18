interface Window {
  createShadowElement: () => HTMLElement;
  getElementById: (id: string, parent?: Document) => HTMLElement;
  querySelector: (selector: string, parent?: Element | Document) => HTMLElement;
  querySelectorAll: (selector: string, parent?: Element | Document) => NodeList | Array<HTMLElement>;
  getElementsByClassName: (className: string, parent?: Element | Document) => HTMLCollection | Array<HTMLElement>;
  getElementsByClass: (className: string, parent?: Element | Document) => HTMLCollection | Array<HTMLElement>;
  getElementsByTagName: (tagName: string, parent?: Element | Document) => HTMLCollection | Array<HTMLElement>;
  getFirstByTagName: (tagName: string, parent?: Element | Document) => HTMLElement;
  setContentsLoadListener: (handler: Function | null) => void;
  getTrustedTypesPolicy: () => any;
  createTrustedScriptURL: (url: string) => any;
  activeContentsLoadHandler?: Function;
  _eridiusTrustedPolicy?: any;
  setContents: (element: HTMLElement, contents: string) => void;
  trustedTypes?: any;
  questionTotal: number;
  questionCorrect: number;
  activeQuizSession: any;
}
