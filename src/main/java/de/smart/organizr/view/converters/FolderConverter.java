package de.smart.organizr.view.converters;

import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.services.interfaces.AuthorService;
import de.smart.organizr.services.interfaces.FolderService;
import de.smart.organizr.view.UserBean;

import javax.faces.component.UIComponent;
import javax.faces.context.FacesContext;
import javax.faces.convert.Converter;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class FolderConverter implements Converter<Folder> {
	private final FolderService folderService;
	private final UserBean userBean;

	public FolderConverter(final FolderService folderService, final UserBean userBean) {
		this.folderService = folderService;
		this.userBean = userBean;
	}


	@Override
	public Folder getAsObject(final FacesContext facesContext, final UIComponent uiComponent, final String s) {
		int extractedId=0;
		final Pattern p = Pattern.compile(".*\\((.*)\\)");
		final Matcher m = p.matcher(s);
		if(m.find()){
			extractedId = Integer.parseInt(m.group(1));
		}
		return folderService.findFolderByID(extractedId).orElse(null);
	}

	@Override
	public String getAsString(final FacesContext facesContext, final UIComponent uiComponent, final Folder folder) {
		if(folder == null){
			return null;
		}
		System.out.println(folder.getName()+" "+"(%d)".formatted(folder.getId()));
		return folder.getName()+" "+"(%d)".formatted(folder.getId());//"#{folder.name} (#{folder.id})
	}
}
