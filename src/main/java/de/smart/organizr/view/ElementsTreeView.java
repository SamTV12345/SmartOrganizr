package de.smart.organizr.view;

import com.itextpdf.text.BadElementException;
import com.itextpdf.text.Document;
import com.itextpdf.text.DocumentException;
import com.itextpdf.text.Image;
import com.itextpdf.text.pdf.Barcode;
import com.itextpdf.text.pdf.PdfDocument;
import com.itextpdf.text.pdf.PdfWriter;
import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.services.interfaces.FolderService;
import de.smart.organizr.services.interfaces.NoteService;
import de.smart.organizr.utils.BarCodeUtils;
import de.smart.organizr.utils.JsfUtils;
import de.smart.organizr.utils.NavigationUtils;
import org.primefaces.PrimeFaces;
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
	private TreeNode root = new DefaultTreeNode("Folders", null);;
	private final UserBean userBean;
	List<byte[]> qrCodeImages;
	private StreamedContent qrCodePage;


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

	private byte[] generateQRCodeForOneNode(final Note note) {
		return BarCodeUtils.generateQRCodeByteArray(note.toString());
	}

	public void generateQrCodeForEveryNote(final Folder folder) throws DocumentException, IOException {
		final Document document = new PdfDocument();
		final ByteArrayOutputStream out = new ByteArrayOutputStream();
		PdfWriter writer = PdfWriter.getInstance(document, out);
		qrCodeImages = new LinkedList<>();
		document.open();
		for(final Element element: folder.getElements()){
			if(element instanceof Note nodeContainedInFolder){
				qrCodeImages.add(generateQRCodeForOneNode(nodeContainedInFolder));
			}
		}
		for(final byte[] qrCodeData: qrCodeImages){
			document.add(Image.getInstance(qrCodeData));
		}
		final InputStream in = new ByteArrayInputStream(out.toByteArray());
		document.close();
		qrCodePage = DefaultStreamedContent.builder()
		                                   .name("your_invoice.pdf")
		                                   .contentType("application/pdf")
		                                   .stream(() -> in)
		                                   .build();

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

	public StreamedContent getQrCodePage() {
		return qrCodePage;
	}

	public void setQrCodePage(final StreamedContent qrCodePage) {
		this.qrCodePage = qrCodePage;
	}

	public TreeNode getRoot() {
		return root;
	}

	public void setRoot(final TreeNode root) {
		this.root = root;
	}
}
