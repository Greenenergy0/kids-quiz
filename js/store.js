// 설정 저장. 파일(file://)로 열거나 시크릿 모드면 브라우저가 localStorage를 막고
// 접근만 해도 예외를 던진다. 그때도 앱은 그냥 돌아가야 하므로 전부 감싸 둔다.
const Store = (function () {
  function get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* 저장은 못 하지만 이번 판은 계속 놀 수 있다 */
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* 무시 */
    }
  }

  return { get, set, remove };
})();
