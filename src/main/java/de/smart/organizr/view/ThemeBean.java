package de.smart.organizr.view;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

public class ThemeBean {
	private final Map<String, String> availableThemes;


	public ThemeBean() {
		this.availableThemes = new HashMap<>();
		this.availableThemes.put("velo", "Primefaces");
		this.availableThemes.put("saga", "Primefaces");
		this.availableThemes.put("arya", "Primefaces");
	}


	public Collection<String> getAllThemes(){
		return availableThemes.keySet();
	}
}
