package de.smart.organizr.configuration;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.GenericFilterBean;

import java.io.IOException;

public class RootRedirect extends GenericFilterBean {
	@Override
	public void doFilter(final ServletRequest servletRequest, final ServletResponse servletResponse,
	                     final FilterChain filterChain)
			throws IOException, ServletException {
		if(((HttpServletRequest) servletRequest).getRequestURI().equals("/")){
			((HttpServletResponse) servletResponse).sendRedirect("/menu.xhtml");
			return;
		}
		filterChain.doFilter(servletRequest, servletResponse);
	}
}
