package app.keel.privacy;

/** What a third-party AI answered: its status and its body, as text. Never logged (V3): the body may hold what was sent. */
public record AiResponse(int status, String body) {

    public boolean ok() {
        return status >= 200 && status < 300;
    }

    @Override
    public String toString() {
        return "AiResponse[" + status + "]";
    }
}
