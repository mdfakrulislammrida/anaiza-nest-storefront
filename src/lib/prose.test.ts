import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decorateProse, proseHtml, sanitizeContentHtml } from "./prose.ts";

const TABLE =
  "<table><thead><tr><th>Budget</th><th>What you get</th></tr></thead><tbody><tr><td>Under ৳1,500</td><td>A single piece</td></tr></tbody></table>";

describe("sanitizeContentHtml", () => {
  it("keeps a table and the text around it exactly", () => {
    const html = `<h2>Gifts</h2><p>Packed &amp; wrapped. <a href="/pages/shipping">Shipping</a></p>${TABLE}<p>Done.</p>`;
    assert.equal(sanitizeContentHtml(html), html);
  });

  it("removes scripts, styles, frames, classes, ids and event handlers", () => {
    const html =
      '<h2 class="x" id="a" style="color:red">Title</h2><script>alert(1)</script><style>p{color:red}</style>' +
      '<p onclick="x()">Hi <a href="/ok" class="b" target="_blank">ok</a></p><iframe src="https://example.test"></iframe><p>After</p>';
    assert.equal(sanitizeContentHtml(html), '<h2>Title</h2><p>Hi <a href="/ok">ok</a></p><p>After</p>');
  });

  it("keeps only the table attributes the content needs", () => {
    const html =
      '<table class="t" style="width:1px" border="1"><tr><th scope="col" colspan="2" align="left">A</th></tr><tr><td rowspan="9" bgcolor="red">B</td></tr></table>';
    assert.equal(
      sanitizeContentHtml(html),
      '<table><tr><th colspan="2">A</th></tr><tr><td>B</td></tr></table>',
    );
  });

  it("drops dangerous link and picture addresses", () => {
    const html =
      '<p><a href="javascript:alert(1)">a</a> <a href=" JaVaScRiPt:x">b</a> <a href="&#106;avascript:x">c</a> <a href="data:text/html,x">d</a> ' +
      '<a href="https://example.test/ok?a=1&amp;b=2">e</a> <a href="mailto:a@example.test">f</a> <a href="/p#f">g</a></p>';
    assert.equal(
      sanitizeContentHtml(html),
      "<p><a>a</a> <a>b</a> <a>c</a> <a>d</a> " +
        '<a href="https://example.test/ok?a=1&amp;b=2">e</a> <a href="mailto:a@example.test">f</a> <a href="/p#f">g</a></p>',
    );
    assert.equal(sanitizeContentHtml('<img src="javascript:x" alt="a" onerror="y()">'), '<img alt="a">');
  });

  it("shows every h1 as an h2 and renames the old inline tags", () => {
    assert.equal(sanitizeContentHtml("<h1>Title</h1><p><b>bold</b> <i>it</i></p>"), "<h2>Title</h2><p><strong>bold</strong> <em>it</em></p>");
  });

  it("keeps the text of a tag it does not know and unwraps spans and divs", () => {
    assert.equal(
      sanitizeContentHtml('<div class="w"><span style="text-decoration: underline;">Care</span> guide</div>'),
      "Care guide",
    );
  });

  it("never lets a stray angle bracket start a tag", () => {
    assert.equal(sanitizeContentHtml("<p>a < b and <script src=x"), "<p>a &lt; b and &lt;script src=x");
  });

  it("drops an unfinished script to the end, and a nested form with its content", () => {
    assert.equal(sanitizeContentHtml("<p>x</p><script>alert('<b>')"), "<p>x</p>");
    assert.equal(sanitizeContentHtml("<p>x</p><form><form><input name=a></form>hidden</form><p>y</p>"), "<p>x</p><p>y</p>");
  });
});

describe("decorateProse", () => {
  it("marks a paragraph that is only an <em>, and a closing one as the sign-off", () => {
    const html = "<h2>A</h2><p><em>For the people you'd pour a second cup for.</em></p><p>Text <em>with</em> emphasis.</p><p><em>Gifted, beautifully.</em></p>";
    assert.equal(
      decorateProse(html),
      "<h2>A</h2><p class=\"an-em\"><em>For the people you'd pour a second cup for.</em></p><p>Text <em>with</em> emphasis.</p><p class=\"an-tagline\"><em>Gifted, beautifully.</em></p>",
    );
  });

  it("does not mistake two emphasised phrases for one", () => {
    const html = "<p><em>one</em> and <em>two</em></p>";
    assert.equal(decorateProse(html), html);
  });

  it("marks a list item that opens with a bold label", () => {
    assert.equal(
      decorateProse("<ul><li><strong>Under ৳1,500</strong> small pieces</li><li>Plain <strong>b</strong></li></ul>"),
      '<ul><li class="an-li-label"><strong>Under ৳1,500</strong> small pieces</li><li>Plain <strong>b</strong></li></ul>',
    );
  });

  it("labels each table cell with its column header, honouring colspan", () => {
    const html =
      '<table><thead><tr><th>Budget</th><th>What</th><th>When</th></tr></thead><tbody><tr><td>৳1,500</td><td>A "box" &amp; note</td><td>1 day</td></tr><tr><td colspan="2">Two wide</td><td>2 days</td></tr></tbody></table>';
    assert.equal(
      decorateProse(html),
      '<table><thead><tr><th>Budget</th><th>What</th><th>When</th></tr></thead><tbody><tr><td data-label="Budget">৳1,500</td><td data-label="What">A "box" &amp; note</td><td data-label="When">1 day</td></tr>' +
        '<tr><td colspan="2" data-label="Budget">Two wide</td><td data-label="When">2 days</td></tr></tbody></table>',
    );
  });

  it("leaves a table with no header row alone", () => {
    const html = "<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>";
    assert.equal(decorateProse(html), html);
  });
});

describe("proseHtml", () => {
  it("cannot be given a class by the content", () => {
    const html = '<p class="an-tagline" style="x"><em>Spoof</em></p><p class="an-em">Also</p><script>1</script>';
    assert.equal(proseHtml(html), '<p class="an-em"><em>Spoof</em></p><p>Also</p>');
  });

  it("styles the sign-off only when it closes the text", () => {
    assert.equal(proseHtml("<p>Text</p><p><em>Gifted, beautifully.</em></p>"), '<p>Text</p><p class="an-tagline"><em>Gifted, beautifully.</em></p>');
  });
});
