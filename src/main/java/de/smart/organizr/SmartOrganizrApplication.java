package de.smart.organizr;

import co.elastic.apm.attach.ElasticApmAttacher;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SmartOrganizrApplication {

	public static void main(final String[] args) {
		ElasticApmAttacher.attach();
		SpringApplication.run(SmartOrganizrApplication.class, args);
	}
}
