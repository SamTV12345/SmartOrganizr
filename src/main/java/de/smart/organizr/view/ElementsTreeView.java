package de.smart.organizr.view;

import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.services.interfaces.FolderService;
import de.smart.organizr.services.interfaces.NoteService;
import de.smart.organizr.utils.JsfUtils;
import de.smart.organizr.utils.NavigationUtils;
import org.primefaces.PrimeFaces;
import org.primefaces.event.NodeCollapseEvent;
import org.primefaces.model.DefaultTreeNode;
import org.primefaces.model.TreeNode;

import javax.annotation.PostConstruct;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

public class ElementsTreeView implements Serializable {
	private final FolderService folderService;
	private final NoteService noteService;
	private TreeNode root = new DefaultTreeNode("Folders", null);;
	private final UserBean userBean;

	public ElementsTreeView(final FolderService folderService,
	                        final NoteService noteService,
	                        final UserBean userBean) {
		this.folderService = folderService;
		this.noteService = noteService;
		this.userBean = userBean;
	}

	@PostConstruct
	public void initialize(){
		initRoot();
	}

	private void initRoot() {
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
				 new DefaultTreeNode(noteToBeAdded,folderToBeAppendedTo);
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

	public void onNodeCollapse(final NodeCollapseEvent event) {
		if (event != null && event.getTreeNode() != null) {
			event.getTreeNode().setExpanded(false);
		}
	}

	public void deleteElement(final Element elementToBeRemoved){
		if(elementToBeRemoved instanceof Folder folder) {
			folderService.deleteFolder(folder);
		}
		else if (elementToBeRemoved instanceof Note note){
			noteService.deleteNote(note);
		}
		root.getChildren().removeIf(element->element.getData().equals(elementToBeRemoved));
		traverseTree(root, elementToBeRemoved);
		PrimeFaces.current().ajax().update("form:elements");
	}


	public void traverseTree(final TreeNode tree, final Element elementToBeRemoved) {
		if(tree.getChildren().removeIf(element->element.getData().equals(elementToBeRemoved))){
			return;
		}
		for (final TreeNode child:tree.getChildren()){
			if (child.getData() instanceof Folder){
				traverseTree(child, elementToBeRemoved);
			}
		}
		initRoot();
	}

	public TreeNode getRoot() {
		return root;
	}

	public void setRoot(final TreeNode root) {
		this.root = root;
	}
}
