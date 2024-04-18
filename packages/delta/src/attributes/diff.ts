import { isObject } from "blocks-kit-utils";

import type { AttributeMap } from "./interface";

export const diffAttributes = (
  a: AttributeMap = {},
  b: AttributeMap = {}
): AttributeMap | undefined => {
  if (!isObject(a)) a = {};
  if (!isObject(b)) b = {};
  const attributes = Object.keys(a)
    .concat(Object.keys(b))
    .reduce<AttributeMap>((attrs, key) => {
      if (a[key] !== b[key]) {
        attrs[key] = b[key] === undefined ? "" : b[key];
      }
      return attrs;
    }, {});
  return Object.keys(attributes).length > 0 ? attributes : undefined;
};
