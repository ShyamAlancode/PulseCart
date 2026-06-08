import { auth } from "./auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const userRole = (req.auth?.user as any)?.role;
  const { nextUrl } = req;

  const isSellerRoute = nextUrl.pathname.startsWith("/seller");
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard");

  if ((isSellerRoute || isAdminRoute || isDashboardRoute) && !isLoggedIn) {
    return Response.redirect(new URL("/auth/signin", nextUrl));
  }

  // Seller route authorization: allow seller and ADMIN
  if (isSellerRoute && userRole !== "seller" && userRole !== "ADMIN") {
    return Response.redirect(new URL("/", nextUrl));
  }

  // Admin route authorization: allow ADMIN only
  if (isAdminRoute && userRole !== "ADMIN") {
    return Response.redirect(new URL("/", nextUrl));
  }
});

export const config = {
  matcher: ["/seller/:path*", "/admin/:path*", "/dashboard/:path*"],
};
