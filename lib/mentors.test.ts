import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mentorInitial, mentorSlug, packMentorList, parseMentorList, unpackMentorList } from "./mentors";

describe("mentor lists", () => {
  it("reads one item per line and a comma-separated line", () => {
    assert.deepEqual(parseMentorList("Hyper bass\nEDM production"), ["Hyper bass", "EDM production"]);
    assert.deepEqual(parseMentorList("Hyper bass, EDM production"), ["Hyper bass", "EDM production"]);
    assert.deepEqual(unpackMentorList(packMentorList(["Live mixing"])), ["Live mixing"]);
    assert.deepEqual(unpackMentorList(""), []);
  });

  it("builds a slug and an initial", () => {
    assert.equal(mentorSlug("Yu Fu"), "yu-fu");
    assert.equal(mentorInitial("Yu Fu"), "Y");
    assert.equal(mentorSlug("   "), "mentor");
  });
});
