package de.smart.organizr.configuration;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Controller
public class WebConfiguration implements WebMvcConfigurer {

	// Match everything without a suffix (so not a static resource)
	@RequestMapping(value = "/ui/{path:[^.]*}")
	public String redirect() {
		// Forward to home page so that route is preserved.(i.e forward:/intex.html)
		return "forward:/ui/index.html";
	}

	@RequestMapping(value = "/ui")
	public String redirectFromFrontendSlash() {
		// Forward to home page so that route is preserved.(i.e forward:/intex.html)
		return "forward:/ui/index.html";
	}
}