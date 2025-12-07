const ApiClient = {
  get: async function (url) {
    const fullUrl = `${CONFIG().API_BASE_URL}${url}`;
    console.log(`[API요청]${fullUrl}`);
    try {
      const response = await fetch(fullUrl, {
        method: "GET",
        header: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`API 오류 : ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error("통신 실패:", err);
      throw err; // 에러를 호출한 쪽으로 던짐
    }
  },
  post: async function (url, data) {
    const fullUrl = `${CONFIG().API_BASE_URL}${url}`;
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  },
};
