import type { Block } from "blocks-kit-delta";

import type { Editor } from "../../editor";
import { BlockModel } from "../../model";
import {
  DATA_BLOCK_ID_KEY,
  DATA_BLOCK_KEY,
  DATA_LINE_KEY,
  EDITABLE_KEY,
} from "../../model/modules/property";
import type { EditorState } from "../index";

export class BlockState {
  public index: number;
  private editor: Editor;
  public readonly id: string;
  public _parent: BlockState | null;
  public readonly model: BlockModel;
  public readonly children: BlockState[];

  constructor(private readonly engine: EditorState, private readonly block: Block) {
    this.index = 0;
    this.id = block.id;
    this.children = [];
    this._parent = null;
    this.editor = this.engine.editor;
    this.model = new BlockModel(this.editor, this);
  }

  public get parent() {
    return this._parent;
  }

  public getRaw() {
    return this.block;
  }

  public getLine(index: number): BlockState | null {
    return this.children[index] || null;
  }

  public getLines() {
    return this.children;
  }

  public setParent(parent: BlockState | null) {
    this._parent = parent;
  }

  public addChild(child: BlockState) {
    child.setParent(this);
    this.children.push(child);
  }

  public getAttr(key: string): string | null {
    return this.block.attributes[key] || null;
  }

  public render() {
    const div = document.createElement("div");
    div.setAttribute(DATA_BLOCK_ID_KEY, this.id);
    this.editor.reflect.setBlockModel(this, div);
    if (this.children.length) {
      div.setAttribute(EDITABLE_KEY, "false");
      div.setAttribute(DATA_BLOCK_KEY, "true");
      for (const child of this.children) {
        const dom = child.render();
        div.appendChild(dom);
      }
    } else {
      div.setAttribute(DATA_LINE_KEY, "true");
      this.model.setDOMNode(div);
      this.model.setContent(this.block.ops);
    }
    return div;
  }
}
