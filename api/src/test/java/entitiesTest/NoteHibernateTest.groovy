package entitiesTest

import de.smart.organizr.entities.classes.AuthorHibernateImpl
import de.smart.organizr.entities.classes.NoteHibernateImpl
import de.smart.organizr.entities.classes.UserHibernateImpl
import de.smart.organizr.entities.interfaces.Author
import de.smart.organizr.entities.interfaces.Element
import de.smart.organizr.entities.interfaces.Note
import de.smart.organizr.entities.interfaces.User
import de.smart.organizr.exceptions.NoteException
import spock.lang.Specification

class NoteHibernateTest extends Specification{
    private static final Calendar calender = Calendar.getInstance();
    private final User user = new UserHibernateImpl("bob", "bob123", "bob@test.com")
    private final Author author = new AuthorHibernateImpl("test", "test",user)


    def "should test the note title"(){
        given:
            final Note note;
        when:
            note=new NoteHibernateImpl(title, "test", calender, author, user)
        then:
            title.trim() == note.getTitle()
        where:
            title ||_
            "Test"         ||_
            "   Ein ganz langer Titel  "       ||_
            "   Lorem ipsum dolar test "         ||_
    }

    def "should test the note author"(){
        given:
            final Note note;
        when:
            note=new NoteHibernateImpl("test", "test", calender, author, user)
        then:
            note.getAuthor() == author
    }

    def "the title may not be empty"(){
        given:
            final Element element
        when:
        element = new NoteHibernateImpl(emptyString, "test", calender, author, user)
        then:
            thrown(NoteException)
        where:
            emptyString ||_
            ""          ||_
            "   "       ||_
            " "         ||_
            "\n"        ||_
    }

    def "the author may not be empty"(){
        given:
        final Element element
        when:
            element = new NoteHibernateImpl("Test", "test", calender, null, user)
        then:
            thrown(NoteException)

    }
}
