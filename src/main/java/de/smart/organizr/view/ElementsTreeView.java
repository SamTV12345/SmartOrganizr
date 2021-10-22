package de.smart.organizr.view;

import com.itextpdf.text.DocumentException;
import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.i18n.I18nExceptionUtils;
import de.smart.organizr.services.interfaces.FolderService;
import de.smart.organizr.services.interfaces.NoteService;
import de.smart.organizr.services.interfaces.PDFService;
import de.smart.organizr.utils.JsfUtils;
import de.smart.organizr.utils.NavigationUtils;
import org.primefaces.event.NodeCollapseEvent;
import org.primefaces.model.DefaultStreamedContent;
import org.primefaces.model.DefaultTreeNode;
import org.primefaces.model.StreamedContent;
import org.primefaces.model.TreeNode;

import javax.annotation.PostConstruct;
import java.io.*;
import java.util.*;
import java.util.stream.Collectors;

public class ElementsTreeView implements Serializable {
	private final FolderService folderService;
	private final NoteService noteService;
	private final PDFService pdfService;
	private TreeNode root = new DefaultTreeNode("Folders", null);;
	private final UserBean userBean;
	private StreamedContent qrCodePage;
	private TreeNode selectedTreeNode;


	public ElementsTreeView(final FolderService folderService,
	                        final NoteService noteService,
	                        final PDFService pdfService, final UserBean userBean) {
		this.folderService = folderService;
		this.noteService = noteService;
		this.pdfService = pdfService;
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

		if(elementToBeEdited instanceof Folder folder) {
			JsfUtils.putFolderIntoFlash(folder);
		}
		else if (elementToBeEdited instanceof Note note){
			JsfUtils.putNoteIntoFlash(note);
		}
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

	public boolean checkIfGeneratedQRCodePageExists(final Folder folder){
		return new File(pdfService.getPathQRCodeOfPDF(folder.getId())).exists();
	}
	public void generateQrCodeForEveryNote(final Folder folder) throws DocumentException, IOException {
		pdfService.generateQrCodeForEveryNote(folder);

	}

	public void onNodeCollapse(final NodeCollapseEvent event) {
		if (event != null && event.getTreeNode() != null) {
			event.getTreeNode().setExpanded(false);
		}
	}

	public void deleteElement(final Element element){
		handleDeletion(element);
	}

	public void deleteElement(){
		if(selectedTreeNode == null){
			JsfUtils.putErrorMessage(I18nExceptionUtils.getElementsTreeNoNodeSelected());
			return;
		}
		final Element elementToBeRemoved = (Element) selectedTreeNode.getData();
		handleDeletion(elementToBeRemoved);

		if(selectedTreeNode!=null) {
			selectedTreeNode.getParent().getChildren().remove(selectedTreeNode);
		}
	}

	private void handleDeletion(final Element elementToBeRemoved) {
		if(elementToBeRemoved.getParent()!=null) {
			elementToBeRemoved.getParent().getElements().remove(elementToBeRemoved);
			folderService.saveFolder(elementToBeRemoved.getParent());
		}
		if(elementToBeRemoved instanceof Folder folder) {
			folderService.deleteFolder(folder);
		}
		else if (elementToBeRemoved instanceof Note note){
			noteService.deleteNote(note);
		}
		traverseTree(root, elementToBeRemoved);
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
	}

	public StreamedContent getQrCodePage(final Folder folder) throws FileNotFoundException {
		final File file = new File(pdfService.getPathQRCodeOfPDF(folder.getId()));
		final FileInputStream fileIn = new FileInputStream(file);
		qrCodePage = DefaultStreamedContent.builder()
		                                   .name("pdf_for_%d.pdf".formatted(folder.getId()))
		                                   .contentType("application/pdf")
		                                   .stream(() -> fileIn)
		                                   .build();
		return qrCodePage;
	}

	public TreeNode getRoot() {
		return root;
	}

	public void setRoot(final TreeNode root) {
		this.root = root;
	}

	public TreeNode getSelectedTreeNode() {
		return selectedTreeNode;
	}

	public void setSelectedTreeNode(final TreeNode selectedTreeNode) {
		this.selectedTreeNode = selectedTreeNode;
	}
}
