package de.smart.organizr.view;

import de.smart.organizr.entities.classes.FolderHibernateImpl;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.services.interfaces.FolderService;
import de.smart.organizr.utils.JsfUtils;

import javax.annotation.PostConstruct;
import java.util.Optional;

public class EditFolderView {
	private final  FolderService folderService;
	private final UserBean userBean;
	private String description;
	private String name;
	private Optional<Folder> optionalFutureParentFolder;

	public EditFolderView(final FolderService folderService, final UserBean userBean) {
		this.folderService = folderService;
		this.userBean = userBean;
	}

	@PostConstruct
	public void initialize(){
		optionalFutureParentFolder =  Optional.ofNullable(JsfUtils.getFolderFromFlash());

	}

	public String saveFolder(){
		final Folder folderToBeSaved = new FolderHibernateImpl(name, description, userBean.getUser());
		optionalFutureParentFolder.ifPresent(folderToBeSaved::setParent);
		folderService.saveFolder(folderToBeSaved);
		return "/viewFoldersView.xhtml";
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(final String description) {
		this.description = description;
	}

	public String getName() {
		return name;
	}

	public void setName(final String name) {
		this.name = name;
	}
}
