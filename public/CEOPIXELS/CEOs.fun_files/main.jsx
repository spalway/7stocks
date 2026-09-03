const Buffer = __vite__cjsImport0_buffer["Buffer"];const React = __vite__cjsImport1_react;const createRoot = __vite__cjsImport2_reactDom_client["createRoot"];const _jsxDEV = __vite__cjsImport8_react_jsxDevRuntime["jsxDEV"];import __vite__cjsImport0_buffer from "/node_modules/.vite/deps/buffer.js?v=e4704181";
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6957d60d";
import __vite__cjsImport2_reactDom_client from "/node_modules/.vite/deps/react-dom_client.js?v=88e4a94e";
import { ConnectionProvider, WalletProvider } from "/node_modules/.vite/deps/@solana_wallet-adapter-react.js?v=04541055";
import App from "/src/App.jsx?t=1788414759812";
import { signingConnection } from "/src/useChain.js";
import { installFavicon } from "/src/favicon.js";
import "/src/styles.css";
var _jsxFileName = "C:/Users/skizp/crypto/new_projects/ceos/src/main.jsx";
import __vite__cjsImport8_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6957d60d";
// web3.js v1 reaches for this off the global object.
globalThis.Buffer = Buffer;
// Independent of React: the tab icon outlives any particular page.
installFavicon();
// An empty wallet list on purpose. Every wallet worth supporting implements the
// Wallet Standard, which the provider discovers from the page itself.
const WALLETS = [];
createRoot(document.getElementById("root")).render(/* @__PURE__ */ _jsxDEV(React.StrictMode, { children: /* @__PURE__ */ _jsxDEV(ConnectionProvider, {
	endpoint: signingConnection.rpcEndpoint,
	children: /* @__PURE__ */ _jsxDEV(WalletProvider, {
		wallets: WALLETS,
		autoConnect: true,
		children: /* @__PURE__ */ _jsxDEV(App, {}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 24,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 23,
		columnNumber: 7
	}, this)
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 22,
	columnNumber: 5
}, this) }, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 21,
	columnNumber: 3
}, this));

//# sourceMappingURL=data:application/json;base64,eyJtYXBwaW5ncyI6IkFBQUEsU0FBUyxjQUFjO0FBQ3ZCLE9BQU8sV0FBVztBQUNsQixTQUFTLGtCQUFrQjtBQUMzQixTQUFTLG9CQUFvQixzQkFBc0I7QUFDbkQsT0FBTyxTQUFTO0FBQ2hCLFNBQVMseUJBQXlCO0FBQ2xDLFNBQVMsc0JBQXNCO0FBQy9CLE9BQU87Ozs7QUFHUCxXQUFXLFNBQVM7O0FBR3BCLGVBQWU7OztBQUlmLE1BQU0sVUFBVSxDQUFDO0FBRWpCLFdBQVcsU0FBUyxlQUFlLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FDMUMsd0JBQUMsTUFBTSxZQUFQLFlBQ0Usd0JBQUMsb0JBQUQ7Q0FBb0IsVUFBVSxrQkFBa0I7V0FDOUMsd0JBQUMsZ0JBQUQ7RUFBZ0IsU0FBUztFQUFTO1lBQ2hDLHdCQUFDLEtBQUQsQ0FBTTs7Ozs7Q0FDUTs7Ozs7QUFDRTs7OztTQUNKOzs7O1FBQ3BCIiwibmFtZXMiOltdLCJzb3VyY2VzIjpbIm1haW4uanN4Il0sInZlcnNpb24iOjMsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEJ1ZmZlciB9IGZyb20gJ2J1ZmZlcic7XG5pbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgY3JlYXRlUm9vdCB9IGZyb20gJ3JlYWN0LWRvbS9jbGllbnQnO1xuaW1wb3J0IHsgQ29ubmVjdGlvblByb3ZpZGVyLCBXYWxsZXRQcm92aWRlciB9IGZyb20gJ0Bzb2xhbmEvd2FsbGV0LWFkYXB0ZXItcmVhY3QnO1xuaW1wb3J0IEFwcCBmcm9tICcuL0FwcC5qc3gnO1xuaW1wb3J0IHsgc2lnbmluZ0Nvbm5lY3Rpb24gfSBmcm9tICcuL3VzZUNoYWluLmpzJztcbmltcG9ydCB7IGluc3RhbGxGYXZpY29uIH0gZnJvbSAnLi9mYXZpY29uLmpzJztcbmltcG9ydCAnLi9zdHlsZXMuY3NzJztcblxuLy8gd2ViMy5qcyB2MSByZWFjaGVzIGZvciB0aGlzIG9mZiB0aGUgZ2xvYmFsIG9iamVjdC5cbmdsb2JhbFRoaXMuQnVmZmVyID0gQnVmZmVyO1xuXG4vLyBJbmRlcGVuZGVudCBvZiBSZWFjdDogdGhlIHRhYiBpY29uIG91dGxpdmVzIGFueSBwYXJ0aWN1bGFyIHBhZ2UuXG5pbnN0YWxsRmF2aWNvbigpO1xuXG4vLyBBbiBlbXB0eSB3YWxsZXQgbGlzdCBvbiBwdXJwb3NlLiBFdmVyeSB3YWxsZXQgd29ydGggc3VwcG9ydGluZyBpbXBsZW1lbnRzIHRoZVxuLy8gV2FsbGV0IFN0YW5kYXJkLCB3aGljaCB0aGUgcHJvdmlkZXIgZGlzY292ZXJzIGZyb20gdGhlIHBhZ2UgaXRzZWxmLlxuY29uc3QgV0FMTEVUUyA9IFtdO1xuXG5jcmVhdGVSb290KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyb290JykpLnJlbmRlcihcbiAgPFJlYWN0LlN0cmljdE1vZGU+XG4gICAgPENvbm5lY3Rpb25Qcm92aWRlciBlbmRwb2ludD17c2lnbmluZ0Nvbm5lY3Rpb24ucnBjRW5kcG9pbnR9PlxuICAgICAgPFdhbGxldFByb3ZpZGVyIHdhbGxldHM9e1dBTExFVFN9IGF1dG9Db25uZWN0PlxuICAgICAgICA8QXBwIC8+XG4gICAgICA8L1dhbGxldFByb3ZpZGVyPlxuICAgIDwvQ29ubmVjdGlvblByb3ZpZGVyPlxuICA8L1JlYWN0LlN0cmljdE1vZGU+LFxuKTtcbiJdfQ==