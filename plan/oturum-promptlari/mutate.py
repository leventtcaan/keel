"""Mutation run: for each (file, old, new), back the file up, apply, run the given tests, restore from the backup."""
import json, os, re, shutil, subprocess, sys

root, test_filter, spec = sys.argv[1], sys.argv[2], sys.argv[3]
mutations = json.load(open(spec))
src = os.path.join(root, 'backend/src/main/java/app/keel', os.environ.get('MUT_DIR', 'engine'))
results = []
for m in mutations:
    path = os.path.join(src, m['file'])
    backup = path + '.bak'
    shutil.copyfile(path, backup)
    try:
        text = open(path).read()
        if text.count(m['old']) != 1:
            results.append((m['name'], 'NOT APPLIED (%d matches)' % text.count(m['old'])))
            continue
        open(path, 'w').write(text.replace(m['old'], m['new']))
        stale = os.path.join(root, 'backend/build/test-results/test/TEST-' + test_filter + '.xml')
        if os.path.exists(stale):
            os.remove(stale)
        run = subprocess.run(['./gradlew', 'test', '--tests', test_filter, '--rerun'], cwd=os.path.join(root, 'backend'),
                             capture_output=True, text=True)
        xml = os.path.join(root, 'backend/build/test-results/test/TEST-' + test_filter + '.xml')
        body = open(xml).read() if os.path.exists(xml) else ''
        # Gradle prints "Class > test(...) > [n] ... FAILED" for each failing test, parameterized ones included.
        failed = sorted(set(m.split(' > ')[1].split('(')[0].split(' · ')[0] for m in re.findall(r'^\S.* > .* FAILED$', run.stdout, re.M)))
        compiled = os.path.exists(xml)
        if failed:
            verdict = 'KILLED by ' + ', '.join(failed)
        elif 'BUILD SUCCESSFUL' in run.stdout:
            verdict = 'SURVIVED'
        elif 'compilation failed' in (run.stdout + run.stderr).lower() or 'error:' in run.stderr:
            verdict = 'COMPILE ERROR (mutation invalid)'
        else:
            verdict = 'NO RESULT: ' + (run.stdout + run.stderr)[-300:].replace('\n', ' ')
        results.append((m['name'], verdict))
    finally:
        # Write the original back (not a rename over the file): Gradle's file watching missed a rename and called the
        # mutated classes up to date afterwards (K-208, 30 Sep).
        with open(backup) as original, open(path, 'w') as restored:
            restored.write(original.read())
        os.remove(backup)
# Leave no mutant's classes behind, whatever the watcher saw.
subprocess.run(['./gradlew', 'compileJava', 'compileTestJava', '--rerun-tasks', '-q'], cwd=os.path.join(root, 'backend'),
               capture_output=True, text=True)
for name, verdict in results:
    print(f'{name:45} {verdict}')
