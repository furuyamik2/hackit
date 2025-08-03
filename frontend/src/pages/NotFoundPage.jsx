const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 text-center">
      <h1 className="text-6xl font-bold text-gray-800">404</h1>
      <p className="mt-4 text-2xl text-gray-600">
        ページが見つかりませんでした。
      </p>
      <p className="mt-2 text-lg text-gray-500">
        お探しのページは削除されたか、URLが変更された可能性があります。
      </p>
      <a
        href="/"
        className="mt-8 px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 transition-colors"
      >
        トップページに戻る
      </a>
    </div>
  );
};

export default NotFoundPage;
