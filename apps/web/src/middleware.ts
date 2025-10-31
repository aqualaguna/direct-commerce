import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request } = context;
  
  // Check if the request is for a protected route
  const protectedRoutes = ['/profile', '/orders', '/settings', '/checkout'];
  const isProtectedRoute = protectedRoutes.some(route => url.pathname.startsWith(route));
  
  if (isProtectedRoute) {
    // Check for authentication token in cookies or headers
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '') ||
                     context.cookies.get('authToken')?.value;
    
    if (!authToken) {
      // Redirect to login page
      return context.redirect('/auth/login');
    }
    
    // Optionally validate the token with Strapi
    try {
      const strapiUrl = import.meta.env.PUBLIC_STRAPI_URL || 'http://localhost:1337';
      const response = await fetch(`${strapiUrl}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      if (!response.ok) {
        // Token is invalid, redirect to login
        return context.redirect('/auth/login');
      }
      
      // Add user data to context for use in pages
      const user = await response.json();
      context.locals['user'] = user;
      
    } catch (error) {
      console.error('Auth validation error:', error);
      return context.redirect('/auth/login');
    }
  }
  
  return next();
});

