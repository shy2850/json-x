var JSON_X = require('./json').JSON;

var a = {name: 'a'};
var b = {name: 'b', parent: a};
var c = {a: a, b: b, go: function () {
    console.log('go! go! go!');
}};
c.self = c;
a.child = b;

try {
    JSON.stringify(c);
}
catch (e) {
    console.log(e);
    // [TypeError: Converting circular structure to JSON]
}

/**
 * @param  {JSON} o [源对象]
 * @param  {String} format  [格式化缩进]
 * @param  {String} ref [是否对循环引用对象使用 $ref 转换, 跟节点标记为 $]
 * @param  {boolean} withFunction [是否使用function转换]
 */
var str_circular = JSON_X.stringify(c, '  '/*format with 4 blanks*/, '$'/*Special char*/, true);
console.log(str_circular);

/*
{
  "a":{
    "name":"a",
    "child":{
      "name":"b",
      "parent":{"$ref":"$.a"}
    }
  },
  "b":{"$ref":"$.a.child"},
  "go":"javascript:function () { console.log('go! go! go!'); }",
  "self":{"$ref":"$"}
}
 */

var rebuild = JSON_X.parse(str_circular, true/*是否回转function*/);
// console.log(rebuild);
/*
{ a: { name: 'a', child: { name: 'b', parent: [Circular] } },
  b: { name: 'b', parent: { name: 'a', child: [Circular] } },
  go: [Function],
  self: [Circular] }
 */

rebuild.go();


/**
 * show structure of global
 */
console.log(JSON_X.stringify(global, ' ', '$'));