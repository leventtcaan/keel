package app.keel.coach;

final class OffLanguageModel implements LanguageModel {

    @Override
    public ModelReply complete(ModelRequest request) {
        return new ModelReply("{}", 0, 0);
    }
}
