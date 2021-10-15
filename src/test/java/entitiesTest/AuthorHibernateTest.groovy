package entitiesTest

import de.smart.organizr.entities.classes.AuthorHibernateImpl
import de.smart.organizr.entities.classes.UserHibernateImpl
import de.smart.organizr.entities.interfaces.Author
import de.smart.organizr.entities.interfaces.User
import de.smart.organizr.exceptions.AuthorException
import spock.lang.Specification

class AuthorHibernateTest extends Specification{
    private User user = new UserHibernateImpl("bob", "bob123", "bob@test.com")

    def "should test the author`s name"(){
        given:
            final Author author = new AuthorHibernateImpl("test", "test", user)
        final String nextName = "Wolfgang Amadeus Mozart"
        when:
            author.setName(nextName);
        then:
            author.getName() == nextName
    }

    def "should test the author`s extra information"(){
        given:
            final Author author = new AuthorHibernateImpl("test", "test", user)
            final String extraInformation = "Wolfgang Amadeus Mozart, der überwiegend mit Wolfgang Amadé Mozart " +
                    "unterschrieb (* 27." +
                    " Jänner 1756 in Salzburg,[1] Erzstift Salzburg, Heiliges Römisches Reich; † 5. Dezember 1791 in " +
                    "Wien,[2] Erzherzogtum Österreich, HRR), war ein Salzburger[3] Musiker und Komponist der Wiener " +
                    "Klassik. Sein umfangreiches Werk genießt weltweite Popularität und gehört zum Bedeutendsten im " +
                    "Repertoire klassischer Musik. (Quelle Wikipedia) "
        when:
            author.setExtraInformation(extraInformation)
        then:
            author.getExtraInformation() == extraInformation
    }

    def "should test the author's id"(){
        given:
            final Author author = new AuthorHibernateImpl(0,"test", "test", user)
        when:
            author.setId(5)
        then:
            author.getId() == 5
    }


    def "an empty author name is not allowed"(){
        given:
            final Author author;
        when:
            author= new AuthorHibernateImpl(0, emptyString as String, "", user);
        then:
            thrown(AuthorException)
        where:
        emptyString ||_
        ""          ||_
        "   "       ||_
        " "         ||_
        "\n"        ||_
    }

    def "an negative author id is not allowed"(){
        given:
        final Author author;
        when:
            author= new AuthorHibernateImpl(negativeId, "", "", user);
        then:
            thrown(AuthorException)
        where:
            negativeId ||_
            -1          ||_
            -5       ||_
            -100         ||_
            -20000        ||_
    }
}
