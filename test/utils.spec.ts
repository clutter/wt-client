import { debounce } from "../src/utils";
const DEBOUNCE_MIN_DEFAULT = 1;

describe("utils.debounce", () => {
  it("debounce should work", (done) => {
    let flipped = false;
    const flipTrue = () => {
      flipped = true;
    };
    const debouncedFlip = debounce(flipTrue, DEBOUNCE_MIN_DEFAULT);
    debouncedFlip();
    setTimeout(() => {
      expect(flipped).toBe(true);
      done();
    }, DEBOUNCE_MIN_DEFAULT + 1);
  });

  it("debounce flush should work", (done) => {
    let flipped = false;
    const flipTrue = () => {
      flipped = true;
    };
    const debouncedFlip = debounce(flipTrue, DEBOUNCE_MIN_DEFAULT);
    debouncedFlip();
    debouncedFlip.flush();
    setTimeout(() => {
      expect(flipped).toBe(true);
      done();
    }, 1);
  });

  it("debounce flush should not work with clear", (done) => {
    let flipped = false;
    const flipTrue = () => {
      flipped = true;
    };
    const debouncedFlip = debounce(flipTrue, DEBOUNCE_MIN_DEFAULT);
    debouncedFlip();
    debouncedFlip.clear();
    debouncedFlip.flush();
    setTimeout(() => {
      expect(flipped).toBe(false);
      done();
    }, 1);
  });
});
