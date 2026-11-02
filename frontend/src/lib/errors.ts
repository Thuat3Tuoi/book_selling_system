import axios from "axios";

export function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401)
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (error.response?.status === 409)
      return "Email này đã được sử dụng. Bạn hãy đăng nhập hoặc chọn email khác.";
    if (error.response?.status === 429)
      return "Bạn thao tác hơi nhanh. Hãy chờ một chút rồi thử lại nhé.";
    const message = error.response?.data?.error?.message;
    if (
      typeof message === "string" &&
      error.response &&
      error.response.status < 500
    )
      return message;
  }
  return fallback;
}
