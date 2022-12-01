package entitiesTest


import de.smart.organizr.entities.classes.FolderHibernateImpl
import de.smart.organizr.entities.classes.UserHibernateImpl
import de.smart.organizr.entities.interfaces.Element
import de.smart.organizr.entities.interfaces.User
import de.smart.organizr.exceptions.ElementException
import spock.lang.Specification

class ElementHibernateTest extends Specification{
    private static final Calendar calender = Calendar.getInstance();
    private final User user = new UserHibernateImpl("bob", "bob123", "bob@test.com")

        def "should test the element name"(){
            given:
                final Element element
            when:
                element = new FolderHibernateImpl("Test", calender, "Test", user)
            then:
                "Test" == element.getName()
        }

        def "should test the element description"(){
            given:
                final Element element
            when:
                element = new FolderHibernateImpl("Test", calender, "Test", user)
            then:
                "Test" == element.getDescription()
        }

        def "should test the element id"(){
            given:
                final Element element
            when:
                element = new FolderHibernateImpl(calender,0,"Test", null,"Test",user,new ArrayList<Element>())
            then:
                0 == element.getId()
         }

    def "the id may not be negative"(){
        given:
            final Element element
        when:
            element = new FolderHibernateImpl(calender,negativeId,"Test", null,"Test",user,new ArrayList<Element>())
        then:
            thrown(ElementException)
        where:
            negativeId ||_
            -1          ||_
            -5       ||_
            -100         ||_
            -20000        ||_
    }

    def "the name may not be empty"(){
        given:
            final Element element
        when:
            element = new FolderHibernateImpl(calender,-5,emptyString as String, null,"Test",user,
                    new ArrayList<Element>())
        then:
            thrown(ElementException)
        where:
            emptyString ||_
            ""          ||_
            "   "       ||_
            " "         ||_
            "\n"        ||_
    }

}
