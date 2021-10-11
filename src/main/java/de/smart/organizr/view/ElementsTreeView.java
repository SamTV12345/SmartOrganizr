package de.smart.organizr.view;

import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.services.interfaces.FolderService;
import de.smart.organizr.utils.JsfUtils;
import de.smart.organizr.utils.NavigationUtils;
import org.primefaces.model.DefaultTreeNode;
import org.primefaces.model.TreeNode;

import javax.annotation.PostConstruct;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

public class ElementsTreeView {
	private final FolderService folderService;
	private TreeNode root;
	private final UserBean userBean;

	public ElementsTreeView(final FolderService folderService, final UserBean userBean) {
		this.folderService = folderService;
		this.userBean = userBean;
	}

	@PostConstruct
	public void initialize(){
		root = new DefaultTreeNode("Folders", null);
		final Collection<Folder> parentFolders = folderService.findAllParentFolders(userBean.getUser().getUserId());
		parentFolders.forEach(parentFolder->{
			final TreeNode parentFolderTreeNode =
				new DefaultTreeNode(parentFolder, root);
			recursivelyAddFolders(parentFolder,parentFolderTreeNode);
		});
	}

	public void recursivelyAddFolders(final Folder folder, final TreeNode folderToBeAppendedTo){
		folder.getElements().forEach(elementToBeAdded->{
			if (elementToBeAdded instanceof Folder folder1){
				final TreeNode newNode = new DefaultTreeNode(folder1, folderToBeAppendedTo);
				recursivelyAddFolders(folder1,newNode);
			}
			else if(elementToBeAdded instanceof Note noteToBeAdded){
				final TreeNode newNoteInTree = new DefaultTreeNode(noteToBeAdded,folderToBeAppendedTo);
			}
		});
	}

	public String getCorrectNamingScheme(final Element element){
		if (element instanceof Folder folder){
			return folder.getName();
		}
		else if(element instanceof Note note){
			return note.getTitle();
		}
		return "";
	}

	public boolean isFolder(final Element element){
		return element instanceof Folder;
	}

	public String navigateToEditElement(final Element elementToBeEdited){
		return NavigationUtils.navigateToEditElementView(elementToBeEdited);
	}

	public String navigateToCreateFolder(final Folder folder){
		JsfUtils.putFolderIntoFlash(folder);
		return "/editFolder";
	}

	public int determinePositionInFolder(final Element node) {
		final Folder parentOfNote = node.getParent();

		 return parentOfNote.getElements().stream().filter(nodeToBeFiltered->nodeToBeFiltered instanceof Note).sorted(
				 Comparator.comparing(note -> ((Note) note).getTitle())).collect(
				Collectors.toList()).indexOf(node);
	}

	public String navigateToCreateFolder(){
		return "/editFolder";
	}

	public String navigateToCreateNote(final Folder folder){
			JsfUtils.putFolderIntoFlash(folder);
			return "/editNote.xhtml";
	}

	public TreeNode getRoot() {
		return root;
	}

	public void setRoot(final TreeNode root) {
		this.root = root;
	}
}
