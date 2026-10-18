import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { courierLink } from "./courier.ts";

describe("the courier link on the Track order page", () => {
  it("names the courier on a plain https link", () => {
    assert.deepEqual(courierLink({ tracking_url: "https://example.test/track/TRK1001", courier_name: "Steadfast" }), {
      href: "https://example.test/track/TRK1001",
      label: "Track with Steadfast",
    });
  });

  it("still works without a courier name", () => {
    assert.equal(courierLink({ tracking_url: "https://example.test/t/1" })?.label, "Track the parcel");
  });

  it("shows no link for anything but a plain https address", () => {
    for (const bad of [null, undefined, "", "   ", "http://example.test/t", "javascript:alert(1)", "//example.test/t", "/track/1", "ftp://example.test", "https://", "data:text/html,x"]) {
      assert.equal(courierLink({ tracking_url: bad as string | null | undefined, courier_name: "Steadfast" }), null, String(bad));
    }
  });
});
