package de.smart.organizr.configuration;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WelcomePageRedirect implements WebMvcConfigurer {

	@Override
	public void addViewControllers(final ViewControllerRegistry registry) {
		registry.addViewController("/")
		        .setViewName("forward:/login.xhtml");
		registry.setOrder(Ordered.HIGHEST_PRECEDENCE);
		registry.addViewController("/login").setViewName("forward://login.xhtml");
	}
}
