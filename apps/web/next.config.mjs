/** @type {import("next").NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  transpilePackages: ["@personal-wiki/wiki-core"],
  async rewrites() {
    return [
      {
        source: "/wiki-api/:path*",
        destination: "http://127.0.0.1:4321/:path*"
      }
    ];
  }
};

export default nextConfig;
