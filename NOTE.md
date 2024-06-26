# NOTE

## Blocks
我思考了很长时间如何设计`Block`化的编辑器，除了对于交互上的设计比较难做之外，对于数据的设计也没有什么比较好的想法，特别是实际上是要管理一棵树形结构，并且同时还需要支持对富文本内容的描述。最开始我想如果直接通过`JSON`来处理嵌套的数据结构表达，但是想了想这岂不是又回到了`Slate`的设计，在这种设计方案下数据描述特别是数据处理会很麻烦。后来我又想分别管理树结构与引用关系，这样当然是没有问题的，只不过看起来并没有那么清晰，特别是还要设计完备的插件化类型支持，这部分可能就没有那么好做了。

后来，我想是不是可以单独将`Blocks`类型放在单独的包里，专门用来管理整棵树的描述，以及类型的扩展等等，而且在扩展类型时不会因为重新`declare module`导致不能实际引用原本的包结构，当然单独引用独立的模块用来做扩展也是可以的。此外，这里就不再单独维护树结构与引用关系了，每个块都会携带自己的引用关系，即父节点`parent`的`id`与子节点`children`的`id`，这里只存储节点的`id`而不是具体的对象引用，在运行时通过状态管理再来获取实际的引用。此外在编辑器的实际对象中也需要维护状态对象，在状态树里需要维护基本的数据操作，最终的操作还是需要映射到所存储的数据结构`BlockSet`。

## 多实例Editor
在上边也提到了，在这里我想做的就是纯`Blocks`的编辑器，而实际上目前我并没有找到比较好的编辑器实现来做参考，主要是类似的编辑器都设计的特别复杂，在没有相关文章的情况很难理解。此外我还是比较倾向于`quill-delta`的数据结，因为其无论是对于协同的支持还是`diff`、`ops`的表达都非常完善，所以我想的是通过多个`Quill Editor`实例来实现嵌套`Blocks`，实际上这里边的坑会有很多，需要禁用大量的编辑器默认行为并且重新实现，例如`History`、`Enter`回车操作、选区变换等等，可以预见这其中需要关注的点会有很多，但是相对于从零实现编辑器需要适配的各种浏览器兼容事件还有类似于输入事件的处理等等，这种管理方式还算是可以接受的。

在这里需要关注一个问题，对于整个编辑器状态管理非常依赖于架构设计，从最开始我想做的就是`Blocks`的编辑器，所以在数据结构上必然需要以嵌套的数据结构来描述，当然在这里我设计的扁平化的`Block`，然后对每个`Block`都存储了`string[]`的`Block`节点信息来获取引用。而在实现的过程中，我关注到了一个特别的问题，如果在设计编辑器时不希望有嵌套的结构，而是希望通过扁平的数据结构描述内容，而在内容中如果引用了块结构那么就再并入`Editor`实例，这种设计虽然在数据结构上与上边的`BlockSet`非常类似，但是整体的表达却是完全不同，`Blocks`的编辑器是完全由最外层的`Block`结构管理引用关系，也就是说引用是在`children`里的，而块引用的编辑器则需要由编辑器本身来管理引用关系，也就是说引用是在`ops`里的。所以说对于数据结构的设计与实现非常依赖于编辑器整体的架构设计，当然在上边这个例子中也可以将块引用的编辑器看作单入口的`Blocks`编辑器，这其中的`Line`表达全部交由`Editor`实例来处理，这就是不同设计中却又相通的点。

## 选区变换
对于选区的问题，我思考了比较久，最终的想法依然还是通过首尾的`RangePoint`来标记节点，需要注意的是如果节点的块不属于同块节点，那么不会继续处理选区`Range`变换。同样的，目前依然是通过首尾节点来标记，所以特别需要关注的是通过首尾节点来标记整个`Range`，采用这个方案可以通过首尾节点与`index`来获取`Range`，这里需要关注的是当节点的内容发生变化时，需要重新计算`index`。实际上这里如果直接遍历当前节点直属的所有`index`状态更新也是可以的，在实际`1`万次加法运算，实际上的时间消耗也只有`0.64306640625ms`不到`1ms`。

我们的编辑器实际上是要完成类似于`slate`的架构，当前设计的架构的是`core`与视图分离，并且此时我们不容易入侵到`quill`编辑器的选区能力，所以最终相关的选区变换还是需要借助`DOM`与`Editor`实例完成，还需要考量在`core`中维护的`state`状态管理。在`DOM`中需要标记`Block`节点、`Line`节点、`Void`节点等等，然后在浏览器`onSelectionChange`事件中进行`Model`的映射。当然整个说起来容易，做起来就难了，这一套下来还是非常复杂的，需要大量时间不断调试才行。

## DOM模型与浏览器选区
浏览器中存在明确的选区策略，在`State 1`的`ContentEditable`状态下，无法做到从`Selection Line 1`选择到`Selection Line 2`，这是浏览器默认行为，而这种选区的默认策略就定染导致我无法基于这种模型实现`Blocks`。而如果是`Stage 2`的模型状态，是完全可以做到选区的正常操作的，在模型方面没有什么问题，但是我们此时的`Quill`选区又出现了问题，由于其在初始化时是会由`<br/>`产生到`div/p`状态的突变，导致其选区的`Range`发生异动，此时在浏览器中的光标是不正确的，而我们此时没有办法入侵到`Quill`中帮助其修正选区，且`DOM`上没有任何辅助我们修正选区的标记，所以这个方式也难以继续下去。因此在这种状态下，我们可能只能选取`Stage 3`策略的形式，并不实现完整的`Blocks`，而是将`Quill`作为嵌套结构的编辑器实例，在这种模型状态下编辑器不会出现选区的偏移问题，我们的嵌套结构也可以借助`Quill`的`Embed Blot`来实现插件扩展嵌套`Block`结构。

```html
<p>State 1</p>
<div contenteditable="false" data-block>
  <div contenteditable="true" data-line>Selection Line 1</div>
  <div contenteditable="true" data-line>selection Line 2</div>
</div>

<p>State 2</p>
<div contenteditable="true" data-block>
  <div contenteditable="true" data-line>Selection Line 1</div>
  <div contenteditable="true" data-line>selection Line 2</div>
</div>

<p>State 3</p>
<div contenteditable="true" data-block>
  <div data-line>Selection Line 1</div>
  <div data-line>selection Line 2</div>
  <div contenteditable="false" data-block>
    <div contenteditable="true" data-line>Selection Line 1</div>
    <div contenteditable="true" data-line>selection Line 2</div>
  </div>
</div>
```
