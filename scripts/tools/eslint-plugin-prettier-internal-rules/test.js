/* eslint-disable import/no-extraneous-dependencies */
"use strict";

const path = require("path");
const { outdent } = require("outdent");
const { RuleTester } = require("eslint");
const { rules } = require(".");

const test = (ruleId, tests) => {
  new RuleTester({ parserOptions: { ecmaVersion: 2021 } }).run(
    ruleId,
    rules[ruleId],
    tests
  );
};

test("await-cli-tests", {
  valid: [
    "async () => await runPrettier()",
    "runPrettier().test()",
    "notRunPrettier()",
    "async () => await runPrettier().stderr",
    outdent`
      async () => {
        const originalStdout = await runPrettier("plugins/options", ["--help"]).stdout;
      }
    `,
  ],
  invalid: [
    {
      code: "runPrettier()",
      errors: [
        { message: "'runPrettier()' should be awaited or calling `.test()`." },
      ],
    },
    {
      code: "runPrettier().stderr",
      errors: [{ message: "'runPrettier().stderr' should be awaited." }],
    },
  ],
});

test("better-parent-property-check-in-needs-parens", {
  valid: ["function needsParens() {return parent.test === node;}"],
  invalid: [
    {
      code: 'return parent.type === "MemberExpression" && key === "object";',
      errors: [{ message: "`key` comparison should be on left side." }],
    },
    {
      code: "return parent.test === node;",
      output: 'return key === "test";',
      errors: [
        { message: 'Prefer `key === "test"` over `parent.test === node`.' },
      ],
    },
    {
      code: "return parent.test !== node;",
      output: 'return key !== "test";',
      errors: [
        { message: 'Prefer `key !== "test"` over `parent.test !== node`.' },
      ],
    },
    {
      code: 'return parent["property"] === node;',
      output: 'return key === "property";',
      errors: [
        {
          message:
            'Prefer `key === "property"` over `parent."property" === node`.',
        },
      ],
    },
  ].map((testCase) => ({
    ...testCase,
    code: `function needsParens() {${testCase.code}}`,
    output: `function needsParens() {${testCase.output || testCase.code}}`,
    filename: "needs-parens.js",
  })),
});

test("directly-loc-start-end", {
  valid: [],
  invalid: [
    {
      code: "options.locStart(node)",
      output: "locStart(node)",
      errors: [
        { message: "Please import `locStart` function and use it directly." },
      ],
    },
    {
      code: "options.locEnd(node)",
      output: "locEnd(node)",
      errors: [
        { message: "Please import `locEnd` function and use it directly." },
      ],
    },
  ],
});

test("flat-ast-path-call", {
  valid: [
    'path.call((childPath) => childPath.notCall(print, "b"), "a")',
    'path.notCall((childPath) => childPath.call(print, "b"), "a")',
    'path.call((childPath) => childPath.call(print, "b"))',
    'path.call((childPath) => childPath.call(print), "a")',
    'path.call((childPath) => notChildPath.call(print), "a")',
    'path.call(functionReference, "a")',
    'path.call((childPath) => notChildPath.call(print, "b"), "a")',
    // Only check `arrow function`
    'path.call((childPath) => {return childPath.call(print, "b")}, "a")',
    'path.call(function(childPath) {return childPath.call(print, "b")}, "a")',
  ],
  invalid: [
    {
      code: 'path.call((childPath) => childPath.call(print, "b"), "a")',
      output: 'path.call(print, "a", "b")',
      errors: [{ message: "Do not use nested `AstPath#call(…)`." }],
    },
    {
      // Trailing comma
      code: 'path.call((childPath) => childPath.call(print, "b"), "a",)',
      output: 'path.call(print, "a", "b")',
      errors: 1,
    },
  ],
});

test("jsx-identifier-case", {
  valid: [
    {
      code: "const isJSXNode = true",
      options: ["isJSXNode"],
    },
  ],
  invalid: [
    {
      code: "function isJSXNode(){}",
      output: "function isJsxNode(){}",
      errors: [{ message: "Please rename 'isJSXNode' to 'isJsxNode'." }],
    },
    {
      code: "const isJSXNode = true",
      output: "const isJsxNode = true",
      errors: [{ message: "Please rename 'isJSXNode' to 'isJsxNode'." }],
    },
  ],
});

test("no-conflicting-comment-check-flags", {
  valid: [
    "CommentCheckFlags.Leading",
    "NotCommentCheckFlags.Leading | NotCommentCheckFlags.Trailing",
    "CommentCheckFlags.Leading | CommentCheckFlags.Trailing | SOMETHING_ELSE",
    "CommentCheckFlags.Leading & CommentCheckFlags.Trailing",
  ],
  invalid: [
    {
      code: "CommentCheckFlags.Leading | CommentCheckFlags.Trailing",
      output: null,
      errors: [
        {
          message:
            "Do not use 'CommentCheckFlags.Leading', 'CommentCheckFlags.Trailing' together.",
        },
      ],
    },
    {
      code: "(CommentCheckFlags.Leading | CommentCheckFlags.Trailing) | CommentCheckFlags.Dangling",
      output: null,
      errors: [
        {
          message:
            "Do not use 'CommentCheckFlags.Leading', 'CommentCheckFlags.Trailing', 'CommentCheckFlags.Dangling' together.",
        },
      ],
    },
    {
      code: "CommentCheckFlags.Leading | CommentCheckFlags.Trailing | CommentCheckFlags.UNKNOWN",
      output: null,
      errors: [
        {
          message:
            "Do not use 'CommentCheckFlags.Leading', 'CommentCheckFlags.Trailing' together.",
        },
      ],
    },
    {
      code: "CommentCheckFlags.Block | CommentCheckFlags.Line | CommentCheckFlags.UNKNOWN",
      output: null,
      errors: [
        {
          message:
            "Do not use 'CommentCheckFlags.Block', 'CommentCheckFlags.Line' together.",
        },
      ],
    },
    {
      code: "CommentCheckFlags.Block | CommentCheckFlags.Block",
      output: null,
      errors: [
        {
          message: "Do not use same flag multiple times.",
        },
      ],
    },
  ],
});

test("no-identifier-n", {
  valid: ["const a = {n: 1}", "const m = 1", "a.n = 1"],
  invalid: [
    {
      code: "const n = 1; alert(n)",
      output: "const node = 1; alert(node)",
      errors: 1,
    },
    {
      code: "const n = 1; alert({n})",
      output: "const node = 1; alert({n: node})",
      errors: 1,
    },
    {
      code: "const {n} = 1; alert(n)",
      output: "const {n: node} = 1; alert(node)",
      errors: 1,
    },
    {
      code: outdent`
        const n = 1;
        function a(node) {
          alert(n, node)
        }
        function b() {
          alert(n)
        }
      `,
      output: outdent`
        const n = 1;
        function a(node) {
          alert(n, node)
        }
        function b() {
          alert(n)
        }
      `,
      errors: [
        {
          suggestions: [
            {
              output: outdent`
                const node = 1;
                function a(node) {
                  alert(node, node)
                }
                function b() {
                  alert(node)
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: "const n = 1;const node = 2;",
      output: "const n = 1;const node = 2;",
      errors: [{ suggestions: [{ output: "const node = 1;const node = 2;" }] }],
    },
  ],
});

test("no-legacy-format-test-fixtures", {
  valid: [
    "run_spec(import.meta, ['babel'])",
    "run_spec({importMeta: import.meta}, ['babel'])",
  ].map((code) => ({ code, parserOptions: { sourceType: "module" } })),
  invalid: [
    {
      code: "run_spec(__dirname, ['babel'])",
      errors: [{ message: "Use `import.meta` instead of `__dirname`." }],
      output: "run_spec(import.meta, ['babel'])",
    },
    {
      code: "run_spec({snippets: ['x'], dirname: __dirname}, ['babel'])",
      errors: [
        {
          message:
            "Use `importMeta: import.meta` instead of `dirname: __dirname`.",
        },
      ],
      output: "run_spec({snippets: ['x'], importMeta: import.meta}, ['babel'])",
    },
  ].map((test) => ({ ...test, parserOptions: { sourceType: "module" } })),
});

test("no-node-comments", {
  valid: [
    "const comments = node.notComments",
    {
      code: "function functionName() {return node.comments;}",
      filename: path.join(__dirname, "../../..", "a.js"),
      options: ["a.js"],
    },
    {
      code: "function functionName() {return node.comments;}",
      filename: path.join(__dirname, "../../..", "a.js"),
      options: [{ file: "a.js", functions: ["functionName"] }],
    },
  ],
  invalid: [
    ...[
      "function functionName() {return node.comments;}",
      "const {comments} = node",
      "const {comments: nodeComments} = node",
    ].map((code) => ({
      code,
      output: code,
      errors: [{ message: "Do not access node.comments." }],
    })),
    {
      code: "function notFunctionName() {return node.comments;}",
      output: "function notFunctionName() {return node.comments;}",
      filename: path.join(__dirname, "../../..", "a.js"),
      options: [{ file: "a.js", functions: ["functionName"] }],
      errors: [{ message: "Do not access node.comments." }],
    },
  ],
});

test("prefer-ast-path-each", {
  valid: ["const foo = path.map()"],
  invalid: [
    {
      code: "path.map()",
      output: "path.each()",
      errors: 1,
    },
  ],
});

test("prefer-create-type-check-function", {
  valid: [
    'node.type === "Identifier"',
    'node.type === "Identifier" || node.type === "FunctionExpression"',
    "const isIdentifier = node => {}",
    'const isIdentifier = async node => node.type === "Identifier"',
    outdent`
      function * isIdentifier(node){
        return node.type === "Identifier";
      }
    `,
    outdent`
      async function isIdentifier(node){
        return node.type === "Identifier";
      }
    `,
    outdent`
      async function * isIdentifier(node){
        return node.type === "Identifier";
      }
    `,
    outdent`
      function isIdentifier(node){
        return;
      }
    `,
    outdent`
      function isIdentifier(node, extraParameter){
        return node.type === "Identifier";
      }
    `,
    outdent`
      function isIdentifier(){
        return node.type === "Identifier";
      }
    `,
    outdent`
      function isIdentifier({node}){
        return node.type === "Identifier";
      }
    `,
    outdent`
      function isIdentifier(node){
        return node.type === "Identifier" && node.type === "FunctionExpression";
      }
    `,
    outdent`
      function isIdentifier(node){
        return node.type === Identifier;
      }
    `,
    outdent`
      function isIdentifier(node){
        return node.type !== "Identifier";
      }
    `,
    outdent`
      function isIdentifier(node){
        return node[type] === "Identifier";
      }
    `,
    outdent`
      function isIdentifier(node){
        return node.type === "Identifier" || node.type === "FunctionExpression" || notTypeChecking();
      }
    `,
    {
      code: 'const isIdentifier = node => node.type === "Identifier";',
      options: [{ ignoreSingleType: true }],
    },
    {
      code: outdent`
        function foo() {
          use(node => node.type === "Identifier" || node.type === "FunctionExpression");
        }
      `,
      options: [{ onlyTopLevelFunctions: true }],
    },
    outdent`
      function isGetterOrSetter(node) {
        return node.kind === "get" || node.kind === "set";
      }
    `,
  ],
  invalid: [
    {
      code: outdent`
        function isIdentifier(node) {
          return node.type === "Identifier";
        }
      `,
      output: outdent`
        const isIdentifier = createTypeCheckFunction([
          "Identifier"
        ]);
      `,
      errors: 1,
    },
    {
      code: outdent`
        export default function isIdentifier(node) {
          return node.type === "Identifier";
        }
      `,
      output: outdent`
        const isIdentifier = createTypeCheckFunction([
          "Identifier"
        ]);
        export default isIdentifier;
      `,
      errors: 1,
    },
    {
      code: outdent`
        export default function (node) {
          return node.type === "Identifier";
        }
      `,
      output: outdent`
        const __please_name_this_function = createTypeCheckFunction([
          "Identifier"
        ]);
        export default __please_name_this_function;
      `,
      errors: 1,
    },
    {
      code: outdent`
        use(function isIdentifier(node) {
          return node.type === "Identifier";
        })
      `,
      output: outdent`
        use(createTypeCheckFunction([
          "Identifier"
        ]))
      `,
      errors: 1,
    },
    {
      code: outdent`
        const foo = node => node.type === "Identifier";
      `,
      output: outdent`
        const foo = createTypeCheckFunction([
          "Identifier"
        ]);
      `,
      errors: 1,
    },
    {
      code: outdent`
        const foo = node => {
          return node.type === "Identifier";
        };
      `,
      output: outdent`
        const foo = createTypeCheckFunction([
          "Identifier"
        ]);
      `,
      errors: 1,
    },
    {
      code: outdent`
        const foo = node =>
          node.type === "Identifier" || node.type === "FunctionExpression";
      `,
      output: outdent`
        const foo = createTypeCheckFunction([
          "Identifier",
          "FunctionExpression"
        ]);
      `,
      errors: 1,
    },
    {
      code: outdent`
        const foo = node =>
          node.type === "Identifier" || node?.type === "FunctionExpression";
      `,
      output: outdent`
        const foo = createTypeCheckFunction([
          "Identifier",
          "FunctionExpression"
        ]);
      `,
      errors: 1,
    },
    // Skip fix if comments inside
    {
      code: outdent`
        const foo = node =>
          node.type === "Identifier" || /* comment */ node.type === "FunctionExpression";
      `,
      output: outdent`
        const foo = node =>
          node.type === "Identifier" || /* comment */ node.type === "FunctionExpression";
      `,
      errors: 1,
    },
  ].map((testCase) => ({
    ...testCase,
    parserOptions: { sourceType: "module" },
  })),
});

test("prefer-indent-if-break", {
  valid: [
    "ifBreak(indent(doc))",
    "notIfBreak(indent(doc), doc, options)",
    "ifBreak(indent(doc), doc, )",
    "ifBreak(...a, ...b, ...c)",
    "ifBreak(notIndent(doc), doc, options)",
    "ifBreak(indent(doc), notSameDoc, options)",
    "ifBreak(indent(...a), a, options)",
    "ifBreak(indent(a, b), a, options)",
  ],
  invalid: [
    {
      code: "ifBreak(indent(doc), doc, options)",
      output: "indentIfBreak( doc, options)",
      errors: [
        {
          message: "Prefer `indentIfBreak(…)` over `ifBreak(indent(…), …)`.",
        },
      ],
    },
    {
      code: "ifBreak((indent(doc)), (doc), options)",
      output: "indentIfBreak( (doc), options)",
      errors: 1,
    },
  ],
});

test("prefer-is-non-empty-array", {
  valid: [
    // `isNonEmptyArray` self is ignored
    outdent`
      function isNonEmptyArray(object){
        return Array.isArray(object) && object.length;
      }
    `,
    "a.b && a.c.length",
    "a.b || !a.b.length",
    '!a["b"] || !a.b.length',
  ],
  invalid: [
    ...[
      "a && a.b && a.b.length",
      "a && a.b && a.b.length !== 0",
      "a && a.b && a.b.length > 0",
      "a && Array.isArray(a.b) && a.b.length",
      "a && Array.isArray(a.b) && a.b.length !== 0",
      "a && Array.isArray(a.b) && a.b.length > 0",
    ].map((code) => ({
      code,
      output: "a && isNonEmptyArray(a.b)",
      errors: 1,
    })),
    ...[
      "!a || !a.b || !a.b.length",
      "!a || !a.b || a.b.length === 0",
      "!a || !Array.isArray(a.b) || !a.b.length",
      "!a || !Array.isArray(a.b) || a.b.length === 0",
    ].map((code) => ({
      code,
      output: "!a || !isNonEmptyArray(a.b)",
      errors: 1,
    })),
  ],
});

test("no-empty-flat-contents-for-if-break", {
  valid: [
    "ifBreak('foo', 'bar')",
    "ifBreak(doc1, doc2)",
    "ifBreak(',')",
    "ifBreak(doc)",
    "ifBreak('foo', '', { groupId })",
    "ifBreak(...foo, { groupId })",
  ],
  invalid: [
    {
      code: "ifBreak('foo', '')",
      output: "ifBreak('foo')",
      errors: [
        {
          message:
            "Please don't pass an empty string to second parameter of ifBreak.",
        },
      ],
    },
    {
      code: "ifBreak('foo'    ,     ''   )",
      output: "ifBreak('foo')",
      errors: [
        {
          message:
            "Please don't pass an empty string to second parameter of ifBreak.",
        },
      ],
    },
    {
      code: "ifBreak(doc, '')",
      output: "ifBreak(doc)",
      errors: [
        {
          message:
            "Please don't pass an empty string to second parameter of ifBreak.",
        },
      ],
    },
  ],
});

test("no-unnecessary-ast-path-call", {
  valid: [
    "call(foo)",
    'foo["call"](bar)',
    "foo.call?.(bar)",
    "foo?.call(bar)",
    "foo.call(bar, name)",
    "foo.notCall(bar)",
    "foo.call(...bar)",
    "foo.call()",
  ],
  invalid: [
    {
      code: "foo.call(bar)",
      output: "bar(foo)",
      errors: 1,
    },
    {
      code: "foo.call(() => bar)",
      output: "foo.call(() => bar)",
      errors: 1,
    },
  ],
});

test("prefer-fs-promises-submodule", {
  valid: [
    "import fs from 'node:fs';",
    "import fs from 'node:fs/promises';",
    "import fs, { promises as fsPromises } from 'node:fs';",
    "import { promises as fs, statSync } from 'node:fs';",
  ].map((code) => ({ code, parserOptions: { sourceType: "module" } })),
  invalid: [
    {
      code: "import { promises as fsPromises } from 'node:fs';",
      errors: 1,
    },
    {
      code: "import { promises as fs } from 'node:fs';",
      errors: 1,
    },
  ].map((testCase) => ({
    ...testCase,
    parserOptions: { sourceType: "module" },
  })),
});

test("prefer-ast-path-getters", {
  valid: [
    "path.getNode(2)",
    "path.getNode",
    "getNode",
    "this.getNode()",
    "path.node",
    "path.getParentNode(2)",
    "path.getParentNode",
    "getParentNode",
    "this.getParentNode()",
    "path.parent",
    "path.grandparent",
  ],
  invalid: [
    // path.getNode
    {
      code: "path.getNode()",
      output: "path.node",
      errors: [
        {
          message: "Prefer `AstPath#node` over `AstPath#getNode()`.",
        },
      ],
    },
    {
      code: "const node = path.getNode()",
      output: "const node = path.node",
      errors: [
        {
          message: "Prefer `AstPath#node` over `AstPath#getNode()`.",
        },
      ],
    },
    {
      code: "fooPath.getNode()",
      output: "fooPath.node",
      errors: [
        {
          message: "Prefer `AstPath#node` over `AstPath#getNode()`.",
        },
      ],
    },

    // path.getValue()
    {
      code: "path.getValue()",
      output: "path.node",
      errors: [
        {
          message: "Prefer `AstPath#node` over `AstPath#getValue()`.",
        },
      ],
    },
    {
      code: "const node = path.getValue()",
      output: "const node = path.node",
      errors: [
        {
          message: "Prefer `AstPath#node` over `AstPath#getValue()`.",
        },
      ],
    },
    {
      code: "fooPath.getValue()",
      output: "fooPath.node",
      errors: [
        {
          message: "Prefer `AstPath#node` over `AstPath#getValue()`.",
        },
      ],
    },

    // path.getParentNode()
    {
      code: "path.getParentNode()",
      output: "path.parent",
      errors: [
        {
          message: "Prefer `AstPath#parent` over `AstPath#getParentNode()`.",
        },
      ],
    },
    {
      code: "const node = path.getParentNode()",
      output: "const node = path.parent",
      errors: [
        {
          message: "Prefer `AstPath#parent` over `AstPath#getParentNode()`.",
        },
      ],
    },
    {
      code: "path.getParentNode()",
      output: "path.parent",
      errors: [
        {
          message: "Prefer `AstPath#parent` over `AstPath#getParentNode()`.",
        },
      ],
    },
    {
      code: "const node = path.getParentNode()",
      output: "const node = path.parent",
      errors: [
        {
          message: "Prefer `AstPath#parent` over `AstPath#getParentNode()`.",
        },
      ],
    },
    {
      code: "fooPath.getParentNode()",
      output: "fooPath.parent",
      errors: [
        {
          message: "Prefer `AstPath#parent` over `AstPath#getParentNode()`.",
        },
      ],
    },

    // path.getParentNode(0)
    {
      code: "path.getParentNode(0)",
      output: "path.parent",
      errors: [
        {
          message: "Prefer `AstPath#parent` over `AstPath#getParentNode(0)`.",
        },
      ],
    },
    {
      code: "const node = path.getParentNode(0)",
      output: "const node = path.parent",
      errors: [
        {
          message: "Prefer `AstPath#parent` over `AstPath#getParentNode(0)`.",
        },
      ],
    },
    {
      code: "path.getParentNode(0)",
      output: "path.parent",
      errors: [
        {
          message: "Prefer `AstPath#parent` over `AstPath#getParentNode(0)`.",
        },
      ],
    },
    {
      code: "const node = path.getParentNode(0)",
      output: "const node = path.parent",
      errors: [
        {
          message: "Prefer `AstPath#parent` over `AstPath#getParentNode(0)`.",
        },
      ],
    },
    {
      code: "fooPath.getParentNode(0)",
      output: "fooPath.parent",
      errors: [
        {
          message: "Prefer `AstPath#parent` over `AstPath#getParentNode(0)`.",
        },
      ],
    },

    // path.getParentNode(1)
    {
      code: "path.getParentNode(1)",
      output: "path.grandparent",
      errors: [
        {
          message:
            "Prefer `AstPath#grandparent` over `AstPath#getParentNode(1)`.",
        },
      ],
    },
    {
      code: "const node = path.getParentNode(1)",
      output: "const node = path.grandparent",
      errors: [
        {
          message:
            "Prefer `AstPath#grandparent` over `AstPath#getParentNode(1)`.",
        },
      ],
    },
    {
      code: "path.getParentNode(1)",
      output: "path.grandparent",
      errors: [
        {
          message:
            "Prefer `AstPath#grandparent` over `AstPath#getParentNode(1)`.",
        },
      ],
    },
    {
      code: "const node = path.getParentNode(1)",
      output: "const node = path.grandparent",
      errors: [
        {
          message:
            "Prefer `AstPath#grandparent` over `AstPath#getParentNode(1)`.",
        },
      ],
    },
    {
      code: "fooPath.getParentNode(1)",
      output: "fooPath.grandparent",
      errors: [
        {
          message:
            "Prefer `AstPath#grandparent` over `AstPath#getParentNode(1)`.",
        },
      ],
    },
  ],
});
