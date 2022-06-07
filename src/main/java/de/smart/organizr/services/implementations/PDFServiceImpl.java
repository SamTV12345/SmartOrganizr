package de.smart.organizr.services.implementations;

import com.itextpdf.text.*;
import com.itextpdf.text.Font;
import com.itextpdf.text.Image;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import de.smart.organizr.entities.classes.NoteHibernateImpl;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.services.interfaces.PDFService;
import de.smart.organizr.utils.BarCodeUtils;
import lombok.extern.java.Log;
import org.primefaces.model.file.UploadedFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Log
public class PDFServiceImpl implements PDFService {
	private static final String PATH_TO_MEDIA_FOLDER = "media/";
	private static final String PATH_TO_GENQRCODE_FOLDER = "genQRCode/";
	private static final Font CATFONT = new Font(Font.FontFamily.TIMES_ROMAN, 18,
			Font.BOLD);
	private static final BufferedImage  standardImage;

	static {
		standardImage = new BufferedImage(400,100,BufferedImage.TYPE_INT_RGB);
		for(int x = 0; x<standardImage.getWidth(); x++) {
			for(int y=0;y<standardImage.getHeight();y++) {
				standardImage.setRGB(x, y, Color.WHITE.getRGB());
			}
		}
	}

	public void checkIfDirectoryExistAndCreate(final File folder){
		if(!folder.exists()){
			folder.mkdir();
		}
	}

	@Override
	public void writePDF(final UploadedFile uploadedFile, final Note note) throws IOException {
		final File mediaFolder = new File(PATH_TO_MEDIA_FOLDER);
		checkIfDirectoryExistAndCreate(mediaFolder);

		final InputStream inputStream = uploadedFile.getInputStream();
		final OutputStream outputStream;

		final File file = new File(PATH_TO_MEDIA_FOLDER + note.getId()+".pdf");

		outputStream = new FileOutputStream(file);

		int read = 0;
		final byte[] bytes = uploadedFile.getContent();

		while ((read = inputStream.read(bytes)) != -1) {
			outputStream.write(bytes, 0, read);
		}
	}

	@Override
	public String getPathMediaFolderOfPDF(final int id){
		return PATH_TO_MEDIA_FOLDER+id+".pdf";
	}

	@Override
	public String getPathQRCodeOfPDF(final int id){
		return PATH_TO_GENQRCODE_FOLDER+id+".pdf";
	}

	@Override
	public boolean checkIfPDFForNoteIsAvailable(final int id){
		return new File(getPathMediaFolderOfPDF(id)).exists();
	}

	@Override
	public InputStream loadPDFFromDisk(final int id) {
		if(checkIfPDFForNoteIsAvailable(id)){
			return getClass().getResourceAsStream(getPathMediaFolderOfPDF(id));

		}
		else{
			throw new RuntimeException();
		}
	}

	@Override
	public void generateQrCodeForEveryNote(final Folder folder) throws DocumentException, IOException {
		final File qrGenCodeFolder = new File(PATH_TO_GENQRCODE_FOLDER);
		checkIfDirectoryExistAndCreate(qrGenCodeFolder);
		final Document document = new Document();
		PdfWriter.getInstance(document, new FileOutputStream(PATH_TO_GENQRCODE_FOLDER+folder.getId()+".pdf"));
		document.open();
		addMetaData(document, folder);
		addTitlePage(document, folder);
		addContent(document, folder);
		document.close();
	}

	@Override
	public void generateQrCodeForEveryPageNote(final Folder folder) throws DocumentException, IOException {
		final File qrGenCodeFolder = new File(PATH_TO_GENQRCODE_FOLDER);
		checkIfDirectoryExistAndCreate(qrGenCodeFolder);
		final Document document = new Document();
		PdfWriter.getInstance(document, new FileOutputStream(PATH_TO_GENQRCODE_FOLDER+folder.getId()+"page"+".pdf"));
		document.open();
		addMetaData(document, folder);
		addTitlePage(document, folder);
		addMinContent(document, folder);
		document.close();
	}

	private static void addMetaData(final Document document, final Folder folder) {
		document.addTitle("QR codes for notes in %s".formatted(folder.getName()));
		document.addSubject("Using iText");
		document.addKeywords("Java, PDF, iText");
		document.addAuthor("SmartOrganizr");
		document.addCreator("SmartOrganizr");
	}


	private static void addTitlePage(final Document document, final Folder folder)
			throws DocumentException {
		final Paragraph preface = new Paragraph();
		// We add one empty line
		addEmptyLine(preface);
		// Lets write a big header
		preface.add(new Paragraph(folder.getName(), CATFONT));

		addEmptyLine(preface);

		document.add(preface);
	}

	private static byte[] generateQRCodeForOneNode(final Note note) {
		return BarCodeUtils.generateQRCodeByteArray(note.toString());
	}

	private static void addContent(final Document document, final Folder folder) throws DocumentException, IOException {
		final java.util.List<byte[]> qrCodeImages=new ArrayList<>();

		final ByteArrayOutputStream baos = new ByteArrayOutputStream();
		ImageIO.write(standardImage, "jpg", baos);

		for (final de.smart.organizr.entities.interfaces.Element element : folder.getElements()) {
				if (element instanceof Note nodeContainedInFolder) {
					qrCodeImages.add(generateQRCodeForOneNode(nodeContainedInFolder));
				}
			}
		final long columns = Math.max(6,Math.round(qrCodeImages.size() / 6.));
		final PdfPTable irdTable = new PdfPTable(Math.toIntExact(columns));
		while (qrCodeImages.size()%columns!=0){
			qrCodeImages.add(baos.toByteArray());
		}
		for (final byte[] qrCodeData : qrCodeImages) {
				final Image image = Image.getInstance(qrCodeData);
				irdTable.addCell(image);
			}
		document.add(irdTable);
		document.close();
	}

	private static void addMinContent(final Document document, final Folder folder) throws DocumentException,
			IOException {
		System.out.println("Created"+ folder.getId()+".pdf");
		final java.util.List<byte[]> qrCodeImages=new ArrayList<>();

		final ByteArrayOutputStream baos = new ByteArrayOutputStream();
		ImageIO.write(standardImage, "jpg", baos);

				final List<Element> notes =
						folder.getElements().stream().filter(element -> element instanceof NoteHibernateImpl).sorted(
								Comparator.comparing(n -> ((NoteHibernateImpl) n).getTitle())).toList();
		for (final de.smart.organizr.entities.interfaces.Element element : notes) {
			if (element instanceof Note nodeContainedInFolder) {
				IntStream.range(0,nodeContainedInFolder.getNumberOfPages()).forEach(num->
						qrCodeImages.add(generateQRCodeForOneNode(nodeContainedInFolder)));
			}
		}
		System.out.println(qrCodeImages.size());
		final long columns = Math.max(10,Math.round(qrCodeImages.size() / 10.));
		final PdfPTable irdTable = new PdfPTable(Math.toIntExact(columns));
		while (qrCodeImages.size()%columns!=0){
			qrCodeImages.add(baos.toByteArray());
		}
		for (final byte[] qrCodeData : qrCodeImages) {

			final Image image = Image.getInstance(qrCodeData);
			irdTable.addCell(image);
		}
		document.add(irdTable);
		document.close();
	}

	private static void addEmptyLine(final Paragraph paragraph) {
		for (int i = 0; i < 1; i++) {
			paragraph.add(new Paragraph(" "));
		}
	}
}
