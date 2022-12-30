package de.smart.organizr.services.implementations;

import com.lowagie.text.DocumentException;
import de.smart.organizr.entities.classes.NoteHibernateImpl;
import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.services.interfaces.FolderService;
import de.smart.organizr.utils.BarCodeUtils;
import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;
import org.xhtmlrenderer.pdf.ITextRenderer;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.List;
import java.util.stream.IntStream;

@RequiredArgsConstructor
@Component
@Slf4j
public class PDFService {
	private final FolderService folderService;

	public String generatePDFOfElement(final int folderId, final String username)  {
		try (final ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
			ClassLoaderTemplateResolver templateResolver = new ClassLoaderTemplateResolver();
			templateResolver.setSuffix(".xhtml");
			templateResolver.setTemplateMode(TemplateMode.HTML);

			TemplateEngine templateEngine = new TemplateEngine();
			templateEngine.setTemplateResolver(templateResolver);

			Context context = new Context();


			final List<String> datas = new ArrayList<>();
			context.setVariable("folder", "MeinTest");
			context.setVariable("medium", "Baeldung");

			final List<Note> notes = folderService.findChildren(username, folderId)
			                                      .stream()
			                                      .filter(c->c instanceof Note)
			                                      .map(c->(Note)c)
			                                      .toList();

			notes.forEach(note-> {
				if(note.getNumberOfPages()==0){
					datas.add(note.toString());
				}
				else {
					IntStream.range(0, note.getNumberOfPages()).forEach(
							i -> {
								try {
									datas.add(BarCodeUtils.generateQRCodeImage(note.toString()));
								}
								catch (Exception e) {
									throw new RuntimeException(e);
								}
							});
				}
			});
			context.setVariable("qrcode", datas);

			final String html = templateEngine.process("qrcode", context);
			System.out.println(html);

			ITextRenderer renderer = new ITextRenderer();
			renderer.setDocumentFromString(html);
			renderer.layout();
			renderer.createPDF(outputStream);


			return Base64.getEncoder().encodeToString(outputStream.toByteArray());
		}
		catch (IOException|DocumentException exception){
			log.error("Error while generating PDF", exception);
			throw new RuntimeException("Error while generating your PDF. Please try again later...");
		}
		catch (Exception e) {
			throw new RuntimeException("Error while generating your PDF. Please try again later...");
		}
	}
}
