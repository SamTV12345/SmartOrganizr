package de.smart.organizr.enums;

/**
 * Kategorien der Speisen, welche als Enums gespeichert werden
 * Suppen, Dessert, Früchte, Salate, Hauptgerichte
 * @author thomas
 *
 */
public enum Category {
	SOUP("Suppe", "dish.soup"), 
	DESSERT("Nachtisch", "dish.dessert"),
	FRUIT("Obst", "dish.fruit"), 
	SALAD("Salat", "dish.salad"), 
	MAIN_DISH("Hauptgericht", "dish.main-dish");
	
	private String categoryName;
	private String i18nKey;
	
	/**
	 * Konstruktor für die Kategorien der Speisen
	 * @param categoryName Name der Kategorie
	 * @param i18nKey Schlüssel für die Internationalisierung
	 */
	private Category(final String categoryName, final String i18nKey) {
		this.categoryName = categoryName;
		this.i18nKey = i18nKey;
	}
	
	@Override
	public String toString() {
		return categoryName;
	}
	
	public String getCategoryName() {
		return categoryName;
	}
	
	public String getI18nKey() {
		return i18nKey;
	}
	
	/**
	 * Gibt die Kategorie als Enum anhand des Kategorie-Namens zurück
	 * @param name Name der Kategorie als String
	 * @return Categorie als Enum
	 */
	public static Category getCategoryByName(final String name) {
		for (final Category category: Category.values()) {
			if(category.categoryName.equals(name)) {
				return category;
			}
		}
		return null;
	}
}
