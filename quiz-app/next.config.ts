import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 让整个应用挂在 theunseenme.site/soulcolour 这个路径下
  // 本地开发时访问 http://localhost:3000/soulcolour
  basePath: "/soulcolour",
};

export default nextConfig;
