(() => {
  let theme = "";
  try {
    theme = window.localStorage.getItem("kambuzi-theme") || "";
  } catch {
    // Fall back to the operating-system preference when storage is blocked.
  }
  if (theme !== "light" && theme !== "dark") {
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#0f1512" : "#17201c");
})();
