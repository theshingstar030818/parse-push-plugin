package github.taivo.parsepushplugin;

import java.lang.RuntimeException;

public class ParsePushConfigException extends RuntimeException{
   public ParsePushConfigException(String message) {
        super(message);
    }
}
