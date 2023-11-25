const foo = {
    bar: 123,
    bazz: {
      good: 12,
      bad: 13,
      wow: {
        worse: 156
      }
    }
  };
  const { bar, bazz, bazz: { bad }, bazz: { wow: { worse } } } = foo;